import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { type IdentifiedPlantResult, type MonthNumber } from '../lib/models';
import { formatMonthsCell } from '../lib/sheet_parser';
import { GardenService } from '../services/garden.service';
import { NotificationService } from '../services/notification.service';

export interface ScannedPlantPhotoItem {
  id: number;
  fileName: string;
  dataUrl: string;
  sheetPhotoDataUrl?: string;
  analyzing: boolean;
  error?: string;
  result?: IdentifiedPlantResult;
}

@Component({
  selector: 'garden-photo-plant-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './photo_plant_dialog.ng.html',
  styleUrl: './photo_plant_dialog.scss',
})
export class PhotoPlantDialogComponent {
  protected readonly service = inject(GardenService);
  private readonly dialogRef = inject(MatDialogRef<PhotoPlantDialogComponent>);
  private readonly notifications = inject(NotificationService);

  private nextId = 1;

  protected readonly activeTabIndex = signal(0);
  protected readonly locationControl = new FormControl('', { nonNullable: true });
  protected readonly scannedItems = signal<ScannedPlantPhotoItem[]>([]);
  protected readonly saving = signal(false);

  protected readonly readyItems = computed(() =>
    this.scannedItems().filter((item): item is ScannedPlantPhotoItem & { result: IdentifiedPlantResult } =>
      Boolean(item.result && !item.analyzing),
    ),
  );

  protected readonly isAnalyzingAny = computed(() => this.scannedItems().some(item => item.analyzing));

  protected readonly manualForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    species: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
  });

  protected formatMonths(months: readonly MonthNumber[]): string {
    return formatMonthsCell(months);
  }

  protected async onFilesSelected(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement | null;
    const files = inputEl?.files ? Array.from(inputEl.files) : [];
    if (!files.length) return;

    if (inputEl) {
      inputEl.value = '';
    }

    for (const file of files) {
      const itemId = this.nextId++;
      this.scannedItems.update(list => [
        ...list,
        {
          id: itemId,
          fileName: file.name,
          dataUrl: '',
          analyzing: true,
        },
      ]);

      try {
        const { image, result } = await this.service.identifyPlantPhoto(file);
        this.scannedItems.update(list =>
          list.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  dataUrl: image.dataUrl,
                  sheetPhotoDataUrl: image.sheetPhotoDataUrl ?? image.dataUrl,
                  analyzing: false,
                  result,
                }
              : item,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.scannedItems.update(list =>
          list.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  analyzing: false,
                  error: msg,
                }
              : item,
          ),
        );
        this.notifications.error(msg);
      }
    }
  }

  protected removeScannedItem(id: number): void {
    this.scannedItems.update(list => list.filter(item => item.id !== id));
  }

  protected async onSaveScannedPlants(): Promise<void> {
    const ready = this.readyItems();
    if (!ready.length) return;

    this.saving.set(true);
    try {
      const loc = this.locationControl.value.trim();
      await this.service.addIdentifiedPlants(
        ready.map(item => ({
          result: item.result,
          location: loc,
          photoUrl: item.sheetPhotoDataUrl ?? item.dataUrl,
        })),
      );
      this.dialogRef.close(true);
    } finally {
      this.saving.set(false);
    }
  }

  protected async onSaveManualPlant(): Promise<void> {
    if (this.manualForm.invalid) return;
    this.saving.set(true);
    try {
      const val = this.manualForm.getRawValue();
      await this.service.addPlant(val.name, val.species, val.location);
      this.dialogRef.close(true);
    } finally {
      this.saving.set(false);
    }
  }
}
