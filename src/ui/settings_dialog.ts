import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { GardenService } from '../services/garden.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'garden-settings-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings_dialog.ng.html',
  styleUrl: './settings_dialog.scss',
})
export class SettingsDialogComponent {
  protected readonly service = inject(GardenService);
  private readonly dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private readonly notifications = inject(NotificationService);

  protected readonly form = new FormGroup({
    selectedSpreadsheetId: new FormControl(this.service.config().selectedSpreadsheetId, {
      nonNullable: true,
    }),
    selectedCalendarId: new FormControl(this.service.config().selectedCalendarId, {
      nonNullable: true,
    }),
    clientId: new FormControl(this.service.config().clientId, { nonNullable: true }),
    geminiApiKey: new FormControl(this.service.config().geminiApiKey, { nonNullable: true }),
    planningHorizonDays: new FormControl(this.service.config().planningHorizonDays, {
      nonNullable: true,
      validators: [Validators.min(7), Validators.max(365)],
    }),
  });

  protected async onSave(): Promise<void> {
    const raw = this.form.getRawValue();
    const prevSheet = this.service.config().selectedSpreadsheetId;
    const prevCal = this.service.config().selectedCalendarId;

    this.service.updateConfig({
      clientId: raw.clientId.trim(),
      geminiApiKey: raw.geminiApiKey.trim(),
      planningHorizonDays: Number(raw.planningHorizonDays) || 90,
    });

    if (raw.selectedSpreadsheetId && raw.selectedSpreadsheetId !== prevSheet) {
      await this.service.selectSpreadsheet(raw.selectedSpreadsheetId);
    }
    if (raw.selectedCalendarId && raw.selectedCalendarId !== prevCal) {
      await this.service.selectCalendar(raw.selectedCalendarId);
    }

    this.notifications.info('Instellingen opgeslagen.');
    this.dialogRef.close(true);
  }

  protected async onSaveAndConnect(): Promise<void> {
    const raw = this.form.getRawValue();
    this.service.updateConfig({
      clientId: raw.clientId.trim(),
      geminiApiKey: raw.geminiApiKey.trim(),
      planningHorizonDays: Number(raw.planningHorizonDays) || 90,
    });
    const ok = await this.service.connectGoogle();
    if (ok) {
      this.dialogRef.close(true);
    }
  }
}
