import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GardenService } from '../services/garden.service';
import { PhotoPlantDialogComponent } from './photo_plant_dialog';
import { SettingsDialogComponent } from './settings_dialog';

@Component({
  selector: 'garden-sidebar',
  imports: [
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.ng.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  readonly isMobile = input<boolean>(false);
  readonly plantSelected = output<number>();
  readonly closeDrawer = output<void>();

  protected readonly service = inject(GardenService);
  private readonly dialog = inject(MatDialog);

  protected selectPlant(rowNumber: number): void {
    this.service.selectedPlantRow.set(rowNumber);
    this.plantSelected.emit(rowNumber);
  }

  protected onSpreadsheetChange(spreadsheetId: string): void {
    void this.service.selectSpreadsheet(spreadsheetId);
  }

  protected onCalendarChange(calendarId: string): void {
    void this.service.selectCalendar(calendarId);
  }

  protected openAddPlantDialog(): void {
    this.dialog.open(PhotoPlantDialogComponent, {
      width: '560px',
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
}
