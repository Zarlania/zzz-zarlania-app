import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Account } from '../../api.models';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly account = signal<Account | null>(HomeComponent.readAccount());

  private static readAccount(): Account | null {
    if (typeof history === 'undefined') {
      return null;
    }
    const state = history.state as { account?: Account } | null;
    return state?.account ?? null;
  }
}
