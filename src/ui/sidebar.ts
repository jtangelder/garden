import { ChangeDetectionStrategy, Component, type TemplateRef, inject, input, output, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GardenService } from '../services/garden.service';
import { SettingsDialogComponent } from './settings_dialog';

@Component({
  selector: 'garden-sidebar',
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
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
  private readonly addPlantDialogTpl = viewChild<TemplateRef<unknown>>('addPlantDialogTpl');

  protected readonly addPlantForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    species: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
  });

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
    const tpl = this.addPlantDialogTpl();
    if (!tpl) return;
    this.addPlantForm.reset({ name: '', species: '', location: '' });
    const ref = this.dialog.open(tpl, {
      width: '440px',
      maxWidth: '92dvw',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().subscribe(result => {
      if (result === 'add' && this.addPlantForm.valid) {
        const val = this.addPlantForm.getRawValue();
        void this.service.addPlant(val.name, val.species, val.location);
      }
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
