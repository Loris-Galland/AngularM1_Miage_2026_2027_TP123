import { Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { AUDIO_TYPES, validateAudioFile } from '../../shared/validators/audio-file';
import { IMAGE_TYPES, validateImageFile } from '../../shared/validators/image-file';
import { FileSizePipe } from '../../shared/pipes/file-size.pipe';
import { AudioFormatPipe } from '../../shared/pipes/audio-format.pipe';

@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule, DatePipe, FileSizePipe, AudioFormatPipe],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);
  private readonly dialog = inject(MatDialog);

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly limit = signal(5);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly audioUrl = signal('');
  readonly current = signal<Track | null>(null);
  readonly audioLoadingId = signal<string | null>(null);
  readonly audioError = signal('');
  readonly deletingId = signal<string | null>(null);
  readonly notice = signal('');
  readonly search = new FormControl('', { nonNullable: true });
  readonly query = signal('');
  private listRequest?: Subscription;
  readonly title = new FormControl('', { nonNullable: true });
  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly fileError = signal('');
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');
  readonly acceptedTypes = AUDIO_TYPES.join(',');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  // Cover images: optional file in the upload form, and one ObjectURL per displayed track.
  readonly imageTypes = IMAGE_TYPES.join(',');
  readonly coverFile = signal<File | null>(null);
  readonly coverError = signal('');
  readonly covers = signal<Record<string, string>>({});
  readonly coverUploadingId = signal<string | null>(null);
  private coverRequests = new Subscription();
  private readonly coverInput = viewChild.required<ElementRef<HTMLInputElement>>('coverInput');

  constructor() {
    this.load();

    // Waits 300 ms after the last key before asking the server, and restarts from page 1.
    this.search.valueChanges
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((query) => {
        this.query.set(query);
        this.page.set(1);
        this.load();
      });

    // The last ObjectURL keeps the whole Blob in memory until it is revoked.
    inject(DestroyRef).onDestroy(() => {
      const url = this.audioUrl();
      if (url) URL.revokeObjectURL(url);
      this.clearCovers();
    });
  }

  chooseCover(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.uploadSuccess.set('');
    this.coverError.set(file ? (validateImageFile(file) ?? '') : '');
    this.coverFile.set(file);
  }

  choose(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    console.debug('[TracksPage] Fichier sélectionné', file?.name);
    this.uploadSuccess.set('');
    this.uploadError.set('');
    this.fileError.set(file ? (validateAudioFile(file) ?? '') : '');
    this.file.set(file);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    // Cancels the previous request so an old answer can never overwrite a newer one.
    this.listRequest?.unsubscribe();
    this.listRequest = this.service.list(this.page(), this.limit(), this.query()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.loadCovers(response.items);
        this.pages.set(response.pages);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de charger vos pistes');
        this.loading.set(false);
      },
    });
  }

  /** Called by mat-paginator: pageIndex starts at 0, the API page starts at 1. */
  onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.load();
  }

  upload(): void {
    const file = this.file();
    if (!file || this.uploading()) return;

    // Same checks as the backend, before any HTTP call.
    const invalid = validateAudioFile(file);
    if (invalid) {
      this.fileError.set(invalid);
      return;
    }

    const title = this.title.value.trim() || file.name;
    this.uploading.set(true);
    this.progress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    this.service.upload(file, title).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          // event.total can be missing if the browser does not know the body size.
          if (event.total) this.progress.set(Math.round((100 * event.loaded) / event.total));
          return;
        }
        if (event.type !== HttpEventType.Response || !event.body) return;

        const track = event.body;
        console.debug('[TracksPage] Piste envoyée', track.id);
        const cover = this.coverFile();
        if (!cover) {
          this.finishUpload(`« ${track.title} » a bien été ajoutée à votre bibliothèque.`);
          return;
        }

        // Second request: the cover has its own route, the track itself already exists.
        this.service.uploadCover(track.id, cover).subscribe({
          next: () => this.finishUpload(`« ${track.title} » a bien été ajoutée avec son image.`),
          error: (error: { error?: { message?: string } }) => {
            console.error('[TracksPage] Envoi de la couverture impossible', error);
            this.finishUpload(`« ${track.title} » a bien été ajoutée à votre bibliothèque.`);
            this.uploadError.set(
              `L'image n'a pas pu être envoyée (${error.error?.message ?? 'erreur inconnue'}). Vous pouvez réessayer depuis la card.`,
            );
          },
        });
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploading.set(false);
        this.uploadError.set(error.error?.message ?? "L'envoi a échoué, réessayez.");
      },
    });
  }

  private finishUpload(message: string): void {
    this.uploading.set(false);
    this.uploadSuccess.set(message);
    this.title.setValue('');
    this.file.set(null);
    this.fileInput().nativeElement.value = '';
    this.coverFile.set(null);
    this.coverInput().nativeElement.value = '';
    this.page.set(1);
    this.load();
  }

  /** Adds or replaces the cover of an existing track from its card. */
  changeCover(track: Track, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const invalid = validateImageFile(file);
    this.notice.set('');
    this.error.set(invalid ?? '');
    if (invalid) return;

    this.coverUploadingId.set(track.id);
    this.service.uploadCover(track.id, file).subscribe({
      next: (updated) => {
        this.coverUploadingId.set(null);
        this.tracks.update((list) => list.map((t) => (t.id === updated.id ? updated : t)));
        this.fetchCover(updated.id);
        this.notice.set(`L'image de « ${track.title} » a été mise à jour.`);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Changement de couverture impossible', error);
        this.coverUploadingId.set(null);
        this.error.set(error.error?.message ?? `Impossible d'envoyer l'image de « ${track.title} ».`);
      },
    });
  }

  /** Fetches the covers of the displayed page only, after revoking the previous page's URLs. */
  private loadCovers(tracks: Track[]): void {
    this.clearCovers();
    tracks.filter((track) => track.hasCover).forEach((track) => this.fetchCover(track.id));
  }

  private fetchCover(id: string): void {
    this.coverRequests.add(
      this.service.cover(id).subscribe({
        next: (blob) => {
          const previous = this.covers()[id];
          if (previous) URL.revokeObjectURL(previous);
          this.covers.update((covers) => ({ ...covers, [id]: URL.createObjectURL(blob) }));
        },
        error: (error) => console.error('[TracksPage] Couverture indisponible', id, error),
      }),
    );
  }

  private clearCovers(): void {
    this.coverRequests.unsubscribe();
    this.coverRequests = new Subscription();
    Object.values(this.covers()).forEach((url) => URL.revokeObjectURL(url));
    this.covers.set({});
  }

  play(track: Track): void {
    this.audioLoadingId.set(track.id);
    this.audioError.set('');

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
        this.current.set(track);
        this.audioLoadingId.set(null);
      },
      error: (error: { status?: number }) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.audioLoadingId.set(null);
        this.audioError.set(
          error.status === 404
            ? `« ${track.title} » est introuvable ou ne vous appartient pas.`
            : `Impossible de récupérer « ${track.title} », réessayez.`,
        );
      },
    });
  }

  /** Asks for confirmation in a Material dialog, then deletes. */
  remove(track: Track): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Supprimer la piste ?',
          message: `« ${track.title} » sera supprimée définitivement de votre bibliothèque.`,
          confirmLabel: 'Supprimer',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.delete(track);
      });
  }

  private delete(track: Track): void {
    this.deletingId.set(track.id);
    this.error.set('');
    this.notice.set('');

    this.service.remove(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        if (this.current()?.id === track.id) this.stopPlayback();
        // Last track of a page other than the first: go back one page instead of showing an empty one.
        if (this.tracks().length === 1 && this.page() > 1) this.page.update((page) => page - 1);
        this.deletingId.set(null);
        this.notice.set(`« ${track.title} » a été supprimée.`);
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Suppression impossible', error);
        this.deletingId.set(null);
        this.error.set(error.error?.message ?? `Impossible de supprimer « ${track.title} ».`);
        // The backend can delete the metadata and still fail on the file: refresh to stay in sync.
        this.load();
      },
    });
  }

  private stopPlayback(): void {
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
    this.audioUrl.set('');
    this.current.set(null);
  }

  /** The Blob was downloaded but the browser cannot decode it. */
  onAudioError(): void {
    const track = this.current();
    console.error('[TracksPage] Erreur du lecteur audio', track?.id);
    this.audioError.set(`Le navigateur n'arrive pas à lire « ${track?.title} » (fichier abîmé ou format non supporté).`);
  }
}
