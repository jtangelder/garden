import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MONTH_NAMES, type MonthNumber, type TaskActionType } from '../lib/models';
import { formatMonthsCell, formatMonthsFull } from '../lib/sheet_parser';
import { GardenService } from '../services/garden.service';
import { SettingsDialogComponent } from './settings_dialog';
import { WelcomeComponent } from './welcome';

@Component({
  selector: 'garden-dashboard',
  imports: [
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
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.ng.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  readonly isMobile = input<boolean>(false);
  readonly toggleSidebar = output<void>();

  protected readonly service = inject(GardenService);
  private readonly dialog = inject(MatDialog);

  protected readonly scheduleColumns = ['date', 'action', 'plants', 'locations', 'syncStatus'] as const;

  protected readonly sheetColumns = [
    'rowNumber',
    'name',
    'location',
    'watering',
    'pruning',
    'trimming',
    'fertilizing',
    'careNotes',
    'actions',
  ] as const;

  protected formatMonths(months: readonly MonthNumber[]): string {
    return formatMonthsCell(months);
  }

  protected formatMonthsLong(months: readonly MonthNumber[]): string {
    return formatMonthsFull(months);
  }

  protected monthName(month: MonthNumber): string {
    return MONTH_NAMES[month];
  }

  protected actionIcon(action: TaskActionType): string {
    switch (action) {
      case 'water':
        return 'water_drop';
      case 'prune':
        return 'content_cut';
      case 'trim':
        return 'carpenter';
      case 'fertilize':
        return 'compost';
    }
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

  protected async onConnectClick(): Promise<void> {
    if (!this.service.config().clientId.trim()) {
      this.openSettingsDialog();
      return;
    }
    await this.service.connectGoogle();
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
