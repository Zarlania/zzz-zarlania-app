import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" role="img" [attr.aria-label]="label()">
      <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
        <!-- wings: right, then mirrored left (inlined, no shared ids so multiple
             instances on a page never collide) -->
        <g fill="var(--color-brand)">
          <path d="M34 28 Q 45 11 59 12 L 55 23 L 51 19 L 48 27 L 44 22 L 41 30 L 38 24 Z" />
          <path d="M59 12 L61 9 L59.5 13 Z" />
        </g>
        <g fill="var(--color-brand)" transform="translate(64,0) scale(-1,1)">
          <path d="M34 28 Q 45 11 59 12 L 55 23 L 51 19 L 48 27 L 44 22 L 41 30 L 38 24 Z" />
          <path d="M59 12 L61 9 L59.5 13 Z" />
        </g>

        <!-- staff -->
        <rect x="30.7" y="13" width="2.6" height="39" rx="1.1" fill="var(--color-brand)" />

        <!-- crystal (glowing gem) -->
        <path d="M32 2 L37.5 10 L32 19 L26.5 10 Z" fill="var(--color-action)" />
        <path
          d="M32 2 L32 19 M26.5 10 L37.5 10"
          stroke="var(--color-bg)"
          stroke-width="0.8"
          fill="none"
        />

        <!-- spearhead base -->
        <rect x="28.5" y="49.5" width="7" height="1.8" rx="0.6" fill="var(--color-brand)" />
        <path d="M32 62 L36.5 51 L27.5 51 Z" fill="var(--color-brand)" />

        <!-- coiled dragon body -->
        <path
          d="M32 49 C 22 49 22 40 32 40 C 43 40 43 31 32 31 C 26 31 25 29 27 28"
          fill="none"
          stroke="var(--color-brand)"
          stroke-width="4.4"
          stroke-linecap="round"
        />

        <!-- dragon head: open-maw side profile rising toward the gem -->
        <path
          d="M27.5 29 C 25 27 25 23 27.5 22 L 24 15 L 28.5 19.5 L 30.5 17.5 L 37 14 L 33 18.8 L 36.5 19.6 L 31 21.4 L 29.8 24 C 29 26 28 27.5 27.5 29 Z"
          fill="var(--color-brand)"
        />
        <circle cx="29" cy="20.4" r="0.8" fill="var(--color-bg)" />
      </svg>
    </span>
  `,
  styles: [
    `
      .logo {
        display: inline-flex;
        align-items: center;
      }
    `,
  ],
})
export class LogoComponent {
  readonly label = input('Zarlania');
}
