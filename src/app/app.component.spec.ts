import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

function stubMatchMedia(prefersDark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('AppComponent (shell)', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(true);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the brand logo in a header', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const header: HTMLElement = fixture.nativeElement.querySelector('header');
    expect(header).toBeTruthy();
    expect(header.querySelector('app-logo')).toBeTruthy();
  });

  it('renders the theme toggle and a router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-theme-toggle')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('links to signup and login', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );
    expect(hrefs).toContain('/signup');
    expect(hrefs).toContain('/login');
  });

  it('routes the header nav Features link to the landing with a fragment', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const navHrefs = Array.from(fixture.nativeElement.querySelectorAll('nav.site-nav a')).map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );
    expect(navHrefs).toContain('/#features');
  });

  it('renders a footer', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('footer')).toBeTruthy();
  });

  it('footer shows the current year dynamically', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footer: HTMLElement = fixture.nativeElement.querySelector('footer');
    expect(footer.textContent).toContain(String(new Date().getFullYear()));
  });

  it('footer links to signup and login', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const footerHrefs = Array.from(fixture.nativeElement.querySelectorAll('footer a')).map((a) =>
      (a as HTMLAnchorElement).getAttribute('href'),
    );
    expect(footerHrefs).toContain('/signup');
    expect(footerHrefs).toContain('/login');
  });

  it('renders a menu toggle button that is collapsed by default', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-controls')).toBe('site-menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the menu when the toggle is clicked', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#site-menu.open')).toBeTruthy();
  });

  it('closes the menu when a menu link is activated', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('#site-menu a');
    link.click();
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the menu when Escape is pressed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggleMenu();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('button.menu-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
