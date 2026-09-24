import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { AUDIO_TYPES, validateAudioFile } from '../../shared/validators/audio-file';

@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly limit = signal(5);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly audioUrl = signal('');
  readonly title = new FormControl('', { nonNullable: true });
  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly fileError = signal('');
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');
  readonly acceptedTypes = AUDIO_TYPES.join(',');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  constructor() {
    this.load();
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
    this.service.list(this.page(), this.limit()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
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
    this.uploadError.set('');
    this.uploadSuccess.set('');

    this.service.upload(file, title).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste envoyée', track.id);
        this.uploading.set(false);
        this.uploadSuccess.set(`« ${track.title} » a bien été ajoutée à votre bibliothèque.`);
        this.title.setValue('');
        this.file.set(null);
        this.fileInput().nativeElement.value = '';
        this.page.set(1);
        this.load();
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploading.set(false);
        this.uploadError.set(error.error?.message ?? "L'envoi a échoué, réessayez.");
      },
    });
  }

  play(track: Track): void {
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error) => console.error('[TracksPage] Lecture impossible', error),
    });
  }
}
