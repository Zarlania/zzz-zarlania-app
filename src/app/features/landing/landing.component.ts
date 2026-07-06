import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private static readonly TITLE = 'Zarlania — Command every collection you own';
  private static readonly DESCRIPTION =
    'Catalog, index, and track the value of your card collections in one vault — starting with Magic: The Gathering.';
  private static readonly ORIGIN = 'https://zarlania.com';
  private static readonly OG_IMAGE = `${LandingComponent.ORIGIN}/og-image.jpg`;

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    this.title.setTitle(LandingComponent.TITLE);
    this.meta.updateTag({ name: 'description', content: LandingComponent.DESCRIPTION });
    this.meta.updateTag({ property: 'og:title', content: LandingComponent.TITLE });
    this.meta.updateTag({ property: 'og:description', content: LandingComponent.DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: LandingComponent.ORIGIN });
    this.meta.updateTag({ property: 'og:image', content: LandingComponent.OG_IMAGE });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: LandingComponent.TITLE });
    this.meta.updateTag({ name: 'twitter:description', content: LandingComponent.DESCRIPTION });
    this.meta.updateTag({ name: 'twitter:image', content: LandingComponent.OG_IMAGE });
  }
}
