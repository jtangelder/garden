import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GardenService } from '../services/garden.service';
import { PhotoPlantDialogComponent } from './photo_plant_dialog';
import { SettingsDialogComponent } from './settings_dialog';

@Component({
  selector: 'garden-sidebar',
  imports: [MatToolbarModule, MatListModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
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

  protected openAddPlantDialog(): void {
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
}
