import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LogoComponent } from './shared/logo/logo.component';
import { ThemeToggleComponent } from './shared/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, LogoComponent, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly year = new Date().getFullYear();
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }
}
