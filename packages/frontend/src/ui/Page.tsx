import type { ReactElement, ReactNode } from 'react';

const CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-8';

type PageProps = {
  /** Toolbar in a grey band above the page, e.g. "Neues Project" and the search. */
  toolbar?: ReactNode;
  /** Page content, starting with its `<h1>`. */
  children: ReactNode;
};

/**
 * Width and spacing of a screen, optionally with a grey toolbar band on top.
 * @example <Page toolbar={<Button>Neu</Button>}><h1>Projects</h1>…</Page>
 */
export function Page({ toolbar, children }: PageProps): ReactElement {
  return (
    <>
      {toolbar && (
        <div className="border-temp-divider border-b">
          <div className={`${CONTAINER} flex flex-wrap items-center gap-3 py-4`}>{toolbar}</div>
        </div>
      )}
      <div className={`${CONTAINER} flex flex-col gap-6 pt-8 print:px-0 print:pt-0`}>
        {children}
      </div>
    </>
  );
}

type PageTitleProps = {
  /** Text of the only `<h1>` of the screen. */
  children: ReactNode;
};

/**
 * Large page heading.
 * @example <PageTitle>Expenses</PageTitle>
 */
export function PageTitle({ children }: PageTitleProps): ReactElement {
  return (
    <h1 className="font-medium text-temp-page-title leading-tight tracking-tight">{children}</h1>
  );
}
