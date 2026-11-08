// The bottom sheet shared by the info card and search. On phones it sits above the date bar at one of three
// heights and the map is padded so its centre stays in the visible area; on wide screens it is the right-hand
// card and nothing here changes the map.
export type SheetState = 'peek' | 'half' | 'full';
export type View = 'card' | 'search';

export interface Padding { top: number; bottom: number; left: number; right: number }

/** Map padding for a sheet state: the sheet's height at the bottom on phones, nothing at peek or on wide screens. */
export function sheetPadding(state: SheetState, sheetHeight: number, phone: boolean): Padding {
  if (!phone || state === 'peek') return { top: 0, bottom: 0, left: 0, right: 0 };
  return { top: 60, bottom: sheetHeight, left: 0, right: 0 };
}

/**
 * Wraps the `#panel` element. Peek means the panel is hidden (the peek hint shows instead); otherwise
 * `data-sheet` says half or full. Anything that shows or hides the panel (Panel.show, Panel.hide) is picked up
 * through a MutationObserver, so callers never need to tell the sheet.
 */
export class Sheet {
  state: SheetState = 'peek';
  viewName: View = 'card';

  constructor(
    private el: HTMLElement,
    private peekEl: HTMLElement,
    private views: Record<View, HTMLElement>,
    private onChange: (state: SheetState, height: number) => void
  ) {
    new MutationObserver(() => this.sync()).observe(el, { attributes: true, attributeFilter: ['hidden', 'data-sheet'] });
    // Card text loads after the sheet opens, so keep the map padding in step with the real height.
    new ResizeObserver(() => this.state !== 'peek' && this.onChange(this.state, el.offsetHeight)).observe(el);
    this.dragHandle(el.querySelector<HTMLElement>('.grab')!);
    document.addEventListener('keydown', (e) => e.key === 'Escape' && this.state !== 'peek' && this.set('peek'));
    this.sync();
  }

  private read(): SheetState {
    return this.el.hidden ? 'peek' : this.el.dataset.sheet === 'full' ? 'full' : 'half';
  }

  private sync() {
    const s = this.read();
    this.peekEl.hidden = s !== 'peek';
    if (s !== 'peek' && this.el.dataset.sheet !== s) this.el.dataset.sheet = s;
    if (s === this.state) return;
    this.state = s;
    this.onChange(s, this.el.offsetHeight);
  }

  set(s: SheetState) {
    if (s === 'peek') this.el.hidden = true;
    else {
      this.el.dataset.sheet = s;
      this.el.hidden = false;
    }
    this.sync();
  }

  view(name: View) {
    this.viewName = name;
    for (const [k, v] of Object.entries(this.views)) v.hidden = k !== name;
  }

  /** Drag the handle up or down to change height; a long drag down closes. */
  private dragHandle(grab: HTMLElement) {
    let y0 = 0;
    grab.addEventListener('pointerdown', (e) => {
      y0 = e.clientY;
      grab.setPointerCapture(e.pointerId);
    });
    grab.addEventListener('pointerup', (e) => {
      if (!grab.hasPointerCapture(e.pointerId)) return;
      grab.releasePointerCapture(e.pointerId);
      const dy = e.clientY - y0;
      if (dy < -40 && this.state === 'half') this.set('full');
      else if (dy > 40) this.set(this.state === 'full' ? 'half' : 'peek');
    });
  }
}
