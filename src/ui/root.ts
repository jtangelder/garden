import { ChangeDetectionStrategy, Component, afterNextRender, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { type MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { map } from 'rxjs';
import { GardenService } from '../services/garden.service';
import { DashboardComponent } from './dashboard';
import { SidebarComponent } from './sidebar';
import { WelcomeComponent } from './welcome';

const MOBILE_MEDIA_QUERY = '(max-width: 850px)';

@Component({
  selector: 'garden-root',
  imports: [MatSidenavModule, SidebarComponent, DashboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './root.ng.html',
})
export class RootComponent {
  protected readonly service = inject(GardenService);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly sidenav = viewChild<MatSidenav>('sidenav');

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe(MOBILE_MEDIA_QUERY).pipe(map(state => state.matches)),
    {
      initialValue:
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia(MOBILE_MEDIA_QUERY).matches
          : false,
    },
  );

  constructor() {
    if (!this.service.connected()) {
      this.service.enableDemo();
    }

    afterNextRender(() => {
      if (!this.service.connected() || this.service.isDemo()) {
        this.openWelcomeDialog();
      }
    });
  }

  protected onPlantSelected(): void {
    if (this.isMobile()) {
      void this.sidenav()?.close();
    }
  }

  private openWelcomeDialog(): void {
    this.dialog.open(WelcomeComponent, {
      width: '500px',
      maxWidth: '92dvw',
      autoFocus: 'first-tabbable',
    });
  }
}
