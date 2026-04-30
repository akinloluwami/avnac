import {
  AppleIcon,
  CommandLineIcon,
  ComputerIcon,
  Download01Icon,
  GithubIcon,
  WindowsNewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/studio")({
  component: StudioPage,
});

const primaryButtonClass =
  "landing-primary-button inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-medium no-underline sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-black/14 bg-white/78 px-8 py-3.5 text-base font-medium text-(--text) no-underline backdrop-blur-sm hover:border-black/22 hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]";

const textLinkClass =
  "font-medium text-(--text) underline decoration-black/15 underline-offset-4 transition-colors hover:text-black";

const sectionLabelClass =
  "text-xs font-bold uppercase tracking-[0.12em] text-(--text-subtle)";

const sectionLabelInverseClass =
  "text-xs font-bold uppercase tracking-[0.12em] text-dark/80";

const releasePageHref =
  "https://github.com/striker561/Avnac-Studio/releases/latest";

const studioRepoHref = "https://github.com/striker561/Avnac-Studio";

const studioBranchHref =
  "https://github.com/striker561/Avnac-Studio/tree/studio";

const striker561TwitterHref = "https://twitter.com/insigdev";
const d3uceyTwitterHref = "https://twitter.com/d3uc3y";

const downloadLinks = [
  {
    label: "Windows",
    title: "Windows installer",
    body: "One-click installer for the latest desktop release.",
    href: "https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-windows-amd64-installer.exe",
    icon: WindowsNewIcon,
    badge: "Latest",
  },
  {
    label: "macOS",
    title: "Arm64 DMG",
    body: "Apple Silicon Macs.",
    href: "https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-arm64.dmg",
    icon: AppleIcon,
    badge: "Recommended",
  },
  {
    label: "macOS Intel",
    title: "Intel DMG",
    body: "Separate build for x86_64 Macs.",
    href: "https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-macos-amd64.dmg",
    icon: AppleIcon,
    badge: "Intel only",
  },
  {
    label: "Linux",
    title: "amd64 binary",
    body: "Portable Linux binary from the latest release.",
    href: "https://github.com/striker561/Avnac-Studio/releases/latest/download/avnac-studio-linux-amd64",
    icon: CommandLineIcon,
    badge: "Portable",
  },
] as const;

const heroHighlights = [
  {
    eyebrow: "Latest builds",
    title: "Windows, macOS, and Linux",
    body: "This page points to the newest published Studio release.",
    icon: Download01Icon,
  },
  {
    eyebrow: "Local workflow",
    title: "Native open, save, and export",
    body: "Keep projects on your machine instead of relying on browser-only storage.",
    icon: ComputerIcon,
  },
  {
    eyebrow: "Independent",
    title: "Shipped from its own GitHub repo",
    body: "Desktop work is maintained separately from upstream Avnac.",
    icon: GithubIcon,
  },
] as const;

const comparisonRows = [
  {
    label: "Where it runs",
    studio: "Installed desktop app",
    web: "Browser tab",
  },
  {
    label: "Where files live",
    studio: "A local app folder on your computer",
    web: "Browser storage",
  },
  {
    label: "Offline use",
    studio: "Ready after install",
    web: "Needs the browser",
  },
  {
    label: "Saving and export",
    studio: "Native file dialogs",
    web: "Browser downloads",
  },
  {
    label: "Best fit",
    studio: "People who want a local desktop workflow",
    web: "People who want instant browser access",
  },
] as const;

const capabilityCards = [
  {
    eyebrow: "Projects",
    title: "Keep your files on your computer.",
    body: "Studio stores work in a local app folder, so your projects are not tied to browser storage alone.",
  },
  {
    eyebrow: "Workflow",
    title: "Use the familiar canvas in a desktop app.",
    body: "You still get the Avnac editing flow, but with native open, save, and export behavior around it.",
  },
  {
    eyebrow: "Releases",
    title: "Follow one fork for builds and desktop work.",
    body: "The Studio fork publishes releases, tracks branch changes, and keeps desktop-specific work in one place.",
  },
] as const;

const commandCards = [
  {
    eyebrow: "Install Go first",
    body: "Wails depends on Go, so install and verify Go before anything else.",
    command:
      "macOS:   brew install go\nWindows: winget install -e --id GoLang.Go\nLinux:   sudo apt update && sudo apt install golang-go\ngo version",
  },
  {
    eyebrow: "Install Wails",
    body: "After Go is ready, install the Wails CLI once.",
    command: "go install github.com/wailsapp/wails/v2/cmd/wails@latest\nwails doctor",
  },
  {
    eyebrow: "Run the desktop app",
    body: "Start the full desktop build with native bindings.",
    command: "cd frontend\nnpm install\ncd ..\nwails dev",
  },
  {
    eyebrow: "Frontend only",
    body: "Use this when you are only changing the UI.",
    command: "cd frontend\nnpm install\nnpm run dev",
  },
] as const;

function StudioPage() {
  return (
    <main className="landing-page">
      <section className="hero-page relative flex min-h-[84dvh] flex-col overflow-hidden px-5 py-14 sm:px-10 sm:py-16 lg:min-h-[76dvh] lg:px-16 lg:py-14">
        <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
        <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl rise-in text-left">
            <div className={sectionLabelClass}>Desktop release</div>
            <h1 className="display-title hero-headline mb-8 font-medium text-balance text-(--text) sm:mb-10 lg:mb-12">
              Download Avnac Studio.
            </h1>
            <p className="mb-10 max-w-2xl text-lg leading-[1.6] text-(--text-muted) sm:mb-12 sm:text-xl sm:leading-[1.55] lg:text-[1.375rem] lg:leading-normal">
              Avnac Studio is the desktop fork of Avnac. It packages the
              editor as a native app for Windows, macOS, and Linux, with local
              files and native save dialogs.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a href="#platform-downloads" className={primaryButtonClass}>
                Pick your platform
              </a>
            </div>

            <div className="mt-10 max-w-2xl rounded-[1.6rem] border border-black/8 bg-white/72 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                  <HugeiconsIcon icon={GithubIcon} size={18} strokeWidth={1.75} />
                </span>
                <div className={sectionLabelClass}>Independent fork</div>
              </div>
              <p className="mt-3 text-[15px] leading-7 text-(--text-muted)">
                Avnac Studio is independently maintained by{" "}
                <a
                  href="https://github.com/striker561"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  striker561
                </a>{" "}
                and{" "}
                <a
                  href="https://github.com/d3uceY"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  d3uceY
                </a>
                . It lives in the{" "}
                <a
                  href={studioRepoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  Avnac Studio fork
                </a>{" "}
                and is not maintained by{" "}
                <a
                  href="https://github.com/akinloluwami"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={textLinkClass}
                >
                  akinloluwami
                </a>{" "}
                or the upstream Avnac project.
              </p>
              <div className="mt-5 flex flex-wrap gap-5">
                <a
                  href={striker561TwitterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow striker561 on Twitter"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text) transition-opacity hover:opacity-70"
                >
                  <span className="text-base">𝕏</span>
                  @insigdev
                </a>
                <a
                  href={d3uceyTwitterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow d3uceY on Twitter"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-(--text) transition-opacity hover:opacity-70"
                >
                  <span className="text-base">𝕏</span>
                  @d3uc3y
                </a>
              </div>
            </div>
          </div>

          <article className="landing-feature-spotlight relative z-20 w-full max-w-xl">
            <div className="landing-feature-window">
              <div className="landing-feature-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="landing-feature-canvas flex flex-col gap-4">
                <div className="rounded-3xl border border-black/8 bg-white/84 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <div className={sectionLabelClass}>Ready to share</div>
                  <h2 className="mt-3 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-(--text)">
                    One place for downloads, repo links, and desktop context.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-(--text-muted)">
                    The links on this page use GitHub&apos;s latest-release
                    download pattern, so they automatically stay current when a
                    new Studio build ships.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {heroHighlights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[1.3rem] border border-black/8 bg-white/86 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                          <HugeiconsIcon
                            icon={item.icon}
                            size={18}
                            strokeWidth={1.75}
                          />
                        </span>
                        <span className="landing-feature-chip">{item.eyebrow}</span>
                      </div>
                      <strong className="mt-4 block text-base font-semibold text-(--text)">
                        {item.title}
                      </strong>
                      <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="platform-downloads" className="landing-section landing-section-tight">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div className={sectionLabelClass}>Download</div>
            <h2 className="display-title landing-section-title">
              Pick your platform.
            </h2>
            <p className="landing-section-copy">
              Every button below follows the newest GitHub release, so this
              page does not need version-by-version link updates.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {downloadLinks.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-copy-card flex h-full flex-col no-underline transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                    <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.75} />
                  </span>
                  <span className="rounded-full border border-black/8 bg-black/3 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-subtle)">
                    {item.badge}
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-semibold text-(--text)">
                    {item.label}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <div className="mt-auto pt-5 text-sm font-medium text-(--text)">
                  Download latest
                </div>
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-black/10 bg-white/70 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <div className={sectionLabelClass}>macOS note</div>
                  <h3 className="mt-2 text-base font-semibold text-(--text)">
                    macOS Security Notice (First Launch)
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-(--text-muted)">
                    If macOS blocks Avnac Studio from opening, the app is not yet
                    signed with Apple. This is expected for early releases.
                  </p>
                </div>
                <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--text-subtle) transition-opacity group-open:opacity-0">
                  Expand
                </span>
              </summary>

              <div className="mt-5 space-y-5 border-t border-black/8 pt-5">
                <div>
                  <h4 className="text-sm font-semibold text-(--text)">
                    Try this first (recommended)
                  </h4>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-(--text-muted)">
                    <li>Locate Avnac.app in Finder</li>
                    <li>Right-click the app</li>
                    <li>Click Open</li>
                    <li>Confirm by clicking Open again</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-(--text)">
                    Alternative method
                  </h4>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-(--text-muted)">
                    <li>Open System Settings</li>
                    <li>Go to Privacy &amp; Security</li>
                    <li>Scroll down to Security</li>
                    <li>Click Allow Anyway next to Avnac Studio</li>
                    <li>Try opening the app again</li>
                  </ol>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-(--text)">
                    Advanced (only if it still doesn&apos;t open)
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                    Open Terminal and run:
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-xl border border-black/8 bg-[#111111] px-4 py-3 text-sm text-white">
                    <code>xattr -rd com.apple.quarantine /Applications/Avnac.app</code>
                  </pre>
                  <p className="mt-2 text-sm leading-6 text-(--text-muted)">
                    Then try opening the app again.
                  </p>
                </div>

                <p className="text-sm leading-6 text-(--text-muted)">
                  This is a temporary limitation of the current release due to
                  macOS security requirements. We&apos;re working toward removing this
                  in a future update.
                </p>
              </div>
            </details>
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-black/8 bg-white/78 px-6 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-md">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={sectionLabelClass}>Repository</div>
                <p className="mt-3 max-w-2xl text-[15px] leading-7 text-(--text-muted)">
                  Releases are published from{" "}
                  <a
                    href={studioRepoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLinkClass}
                  >
                    striker561/Avnac-Studio
                  </a>
                  , and active desktop development lives on the{" "}
                  <a
                    href={studioBranchHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLinkClass}
                  >
                    studio branch
                  </a>
                  .
                </p>
              </div>
              <a
                href={studioBranchHref}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                View studio branch
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-process-shell">
            <div className="landing-process-header">
              <div>
                <div className={sectionLabelInverseClass}>
                  Desktop or web
                </div>
                <h2 className="display-title landing-process-title">
                  Choose the version that fits your workflow.
                </h2>
              </div>
              <p>
                Both versions follow the same editor direction. The main
                difference is whether you want a local desktop install or a
                browser-based workflow.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.6rem] border border-black/8 bg-white/78 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl border-collapse text-left">
                  <thead className="bg-black/3 text-sm text-(--text-subtle)">
                    <tr>
                      <th className="px-5 py-4 font-medium">Area</th>
                      <th className="px-5 py-4 font-medium">Avnac Studio</th>
                      <th className="px-5 py-4 font-medium">Avnac web</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="border-t border-black/6 align-top">
                        <th className="px-5 py-4 text-sm font-semibold text-(--text)">
                          {row.label}
                        </th>
                        <td className="px-5 py-4 text-sm leading-6 text-(--text-muted)">
                          {row.studio}
                        </td>
                        <td className="px-5 py-4 text-sm leading-6 text-(--text-muted)">
                          {row.web}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div className={sectionLabelClass}>Why Studio</div>
            <h2 className="display-title landing-section-title">
              What you get on desktop.
            </h2>
            <p className="landing-section-copy">
              Studio keeps the Avnac editor familiar while making the surrounding
              workflow feel like a proper desktop app.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {capabilityCards.map((card) => (
              <article key={card.title} className="landing-copy-card flex h-full flex-col">
                <div className={sectionLabelClass}>{card.eyebrow}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-ai-shell">
            <div className="landing-ai-header">
              <div className={sectionLabelClass}>For developers</div>
              <h2 className="display-title landing-section-title">
                Working on the desktop fork?
              </h2>
              <p className="landing-section-copy">
                These commands are based on the Studio setup flow, with Go
                first and Wails second.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {commandCards.map((card) => (
                <article key={card.eyebrow} className="landing-ai-card flex h-full flex-col">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-black/5 text-(--text)">
                      <HugeiconsIcon
                        icon={CommandLineIcon}
                        size={18}
                        strokeWidth={1.75}
                      />
                    </span>
                    <div className="landing-kicker">{card.eyebrow}</div>
                  </div>
                  <p className="mt-4">{card.body}</p>
                  <pre className="mt-6 h-43 overflow-x-auto rounded-[1.2rem] bg-[#111111] px-4 py-4 text-sm leading-7 text-white">
                    <code className="block whitespace-pre-wrap">{card.command}</code>
                  </pre>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-last">
        <div className="landing-container">
          <div className="landing-cta-band landing-cta-band-only">
            <div>
              <div className={sectionLabelClass}>Maintained independently</div>
              <h2 className="display-title landing-cta-title">
                Follow the Studio fork for desktop builds and updates.
              </h2>
            </div>
            <div className="landing-cta-actions">
              <a
                href={releasePageHref}
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButtonClass}
              >
                Open releases
              </a>
              <a
                href={studioBranchHref}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                View studio branch
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
