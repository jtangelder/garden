import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MONTH_NAMES, type MonthNumber, type PlantRecord, type TaskActionType } from '../lib/models';
import { groupTasksByMonth, todayIso } from '../lib/scheduler';
import { formatMonthsCell, formatMonthsFull, parseMonthsCell } from '../lib/sheet_parser';
import { GardenService } from '../services/garden.service';
import { PhotoPlantDialogComponent } from './photo_plant_dialog';
import { SettingsDialogComponent } from './settings_dialog';
import { WelcomeComponent } from './welcome';

@Component({
  selector: 'garden-dashboard',
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatCardModule,
    MatBadgeModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.ng.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  readonly isMobile = input<boolean>(false);

  protected readonly service = inject(GardenService);
  private readonly dialog = inject(MatDialog);
  private readonly plantDetailDialogTpl = viewChild<TemplateRef<unknown>>('plantDetailDialogTpl');

  protected readonly plantSearchQuery = signal('');
  protected readonly editingPlant = signal(false);

  protected readonly plantEditForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    species: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    wateringDaysSummer: new FormControl<number | null>(null),
    wateringDaysWinter: new FormControl<number | null>(null),
    pruningMonthsText: new FormControl('', { nonNullable: true }),
    trimmingMonthsText: new FormControl('', { nonNullable: true }),
    fertilizingMonthsText: new FormControl('', { nonNullable: true }),
    careNotes: new FormControl('', { nonNullable: true }),
  });

  protected readonly todayDateIso = computed(() => todayIso());

  protected readonly monthGroups = computed(() =>
    groupTasksByMonth(this.service.filteredTasks(), this.todayDateIso(), true),
  );

  protected readonly filteredPlants = computed(() => {
    const query = this.plantSearchQuery().trim().toLowerCase();
    const all = this.service.plants();
    if (!query) return all;
    return all.filter(
      plant =>
        plant.name.toLowerCase().includes(query) ||
        plant.species.toLowerCase().includes(query) ||
        plant.location.toLowerCase().includes(query) ||
        plant.careNotes.toLowerCase().includes(query),
    );
  });

  protected readonly scheduleColumns = ['date', 'action', 'plants', 'locations', 'syncStatus'] as const;

  protected readonly sheetColumns = ['name', 'location', 'watering', 'pruning', 'fertilizing', 'actions'] as const;

  protected formatMonths(months: readonly MonthNumber[]): string {
    return formatMonthsCell(months);
  }

  protected formatMonthsLong(months: readonly MonthNumber[]): string {
    return formatMonthsFull(months);
  }

  protected monthName(month: MonthNumber): string {
    return MONTH_NAMES[month];
  }

  protected actionLabel(action: TaskActionType): string {
    switch (action) {
      case 'water':
        return 'Water geven';
      case 'prune':
        return 'Snoeien';
      case 'trim':
        return 'Knippen';
      case 'fertilize':
        return 'Bemesten';
    }
  }

  protected onFilterChange(value: 'all' | TaskActionType | undefined): void {
    this.service.selectedActionFilter.set(value || 'all');
  }

  protected onHorizonChange(days: number): void {
    this.service.updateConfig({ planningHorizonDays: days });
  }

  protected onPlantSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.plantSearchQuery.set(target?.value ?? '');
  }

  protected clearPlantSearch(): void {
    this.plantSearchQuery.set('');
  }

  protected openPlantDetailDialog(plant: PlantRecord): void {
    this.service.selectedPlantRow.set(plant.rowNumber);
    this.editingPlant.set(false);
    this.populateEditForm(plant);
    const tpl = this.plantDetailDialogTpl();
    if (!tpl) return;
    this.dialog.open(tpl, {
      width: '640px',
      maxWidth: '94dvw',
      autoFocus: 'first-tabbable',
    });
  }

  protected startEditingPlant(plant: PlantRecord): void {
    this.populateEditForm(plant);
    this.editingPlant.set(true);
  }

  protected cancelEditingPlant(): void {
    this.editingPlant.set(false);
  }

  protected async saveEditedPlant(rowNumber: number): Promise<void> {
    if (this.plantEditForm.invalid) return;
    const raw = this.plantEditForm.getRawValue();
    await this.service.updatePlantDetails(rowNumber, {
      name: raw.name.trim(),
      species: raw.species.trim(),
      location: raw.location.trim(),
      wateringDaysSummer:
        raw.wateringDaysSummer !== null && raw.wateringDaysSummer >= 0 ? Number(raw.wateringDaysSummer) : null,
      wateringDaysWinter:
        raw.wateringDaysWinter !== null && raw.wateringDaysWinter >= 0 ? Number(raw.wateringDaysWinter) : null,
      pruningMonths: parseMonthsCell(raw.pruningMonthsText),
      trimmingMonths: parseMonthsCell(raw.trimmingMonthsText),
      fertilizingMonths: parseMonthsCell(raw.fertilizingMonthsText),
      careNotes: raw.careNotes.trim(),
    });
    this.editingPlant.set(false);
  }

  private populateEditForm(plant: PlantRecord): void {
    this.plantEditForm.setValue({
      name: plant.name,
      species: plant.species,
      location: plant.location,
      wateringDaysSummer: plant.wateringDaysSummer,
      wateringDaysWinter: plant.wateringDaysWinter,
      pruningMonthsText: plant.pruningMonths.length ? formatMonthsCell(plant.pruningMonths) : '',
      trimmingMonthsText: plant.trimmingMonths.length ? formatMonthsCell(plant.trimmingMonths) : '',
      fertilizingMonthsText: plant.fertilizingMonths.length ? formatMonthsCell(plant.fertilizingMonths) : '',
      careNotes: plant.careNotes,
    });
  }

  protected openPlantDetailByName(plantName: string): void {
    const normalized = plantName.trim().toLowerCase();
    const match = this.service.plants().find(p => p.name.trim().toLowerCase() === normalized);
    if (match) {
      this.openPlantDetailDialog(match);
    }
  }

  protected removeSelectedPlantAndClose(rowNumber: number): void {
    this.dialog.closeAll();
    void this.service.removePlant(rowNumber);
  }

  protected async onPlantPhotoChange(event: Event, rowNumber: number): Promise<void> {
    const inputEl = event.target as HTMLInputElement | null;
    const file = inputEl?.files?.[0];
    if (!file) return;
    if (inputEl) {
      inputEl.value = '';
    }
    await this.service.updatePlantPhoto(rowNumber, file);
  }

  protected async onConnectClick(): Promise<void> {
    if (!this.service.config().clientId.trim()) {
      this.openSettingsDialog();
      return;
    }
    await this.service.connectGoogle();
  }

  protected openAddPlantPhotoDialog(): void {
    this.dialog.open(PhotoPlantDialogComponent, {
      width: '540px',
      maxWidth: '94dvw',
      autoFocus: 'first-tabbable',
    });
  }

  protected openSettingsDialog(): void {
    this.dialog.open(SettingsDialogComponent, {
      width: '560px',
      maxWidth: '94dvw',
      autoFocus: 'first-tabbable',
    });
  }

  protected openAboutDialog(): void {
    this.dialog.open(WelcomeComponent, {
      width: '500px',
      maxWidth: '92dvw',
      autoFocus: 'first-tabbable',
    });
  }
}
