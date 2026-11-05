import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { GardenService } from '../services/garden.service';
import { SettingsDialogComponent } from './settings_dialog';

@Component({
  selector: 'garden-welcome',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.ng.html',
  styleUrl: './welcome.scss',
})
export class WelcomeComponent {
  protected readonly service = inject(GardenService);
  private readonly dialogRef = inject(MatDialogRef<WelcomeComponent>);
  private readonly dialog = inject(MatDialog);

  protected onExploreDemo(): void {
    this.service.enableDemo();
    this.dialogRef.close();
  }

  protected onOpenSettings(): void {
    this.dialogRef.close();
    this.dialog.open(SettingsDialogComponent, {
      width: '560px',
      maxWidth: '94dvw',
      autoFocus: 'first-tabbable',
    });
  }

  protected async onConnectGoogle(): Promise<void> {
    if (!this.service.config().clientId.trim()) {
      this.onOpenSettings();
      return;
    }
    const ok = await this.service.connectGoogle();
    if (ok) {
      this.dialogRef.close();
    }
  }
}
