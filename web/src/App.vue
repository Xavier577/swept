<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUpRight,
  ChevronDown,
  Code2,
  Container,
  Database,
  FolderSearch,
  GitFork,
  Hammer,
  LockKeyhole,
  Moon,
  Package,
  ScanLine,
  ShieldCheck,
  Sun,
  Terminal,
  X,
} from "@lucide/vue";
import ActionLink from "./components/ActionLink.vue";
import AppShot from "./components/AppShot.vue";
import SectionIntro from "./components/SectionIntro.vue";
import ReleaseDownloads from "./components/ReleaseDownloads.vue";
import catalogData from "./data/releases.json";
import type { ReleaseCatalog } from "./releases";
const catalog = catalogData as ReleaseCatalog;

const icon = `${import.meta.env.BASE_URL}icon.svg`;
const repo = "https://github.com/Xavier577/swept";
const theme = ref<"light" | "dark">("light");
const tour = [
  {
    id: "overview",
    title: "Find the leftovers",
    label: "Overview",
    icon: ScanLine,
    description:
      "Developer caches and build artifacts, brought into one view. See the paths, sizes, and reasons before you select anything.",
    alt: "Swept overview showing measured developer caches and cleanup candidates across categories.",
  },
  {
    id: "explorer",
    title: "Follow the space",
    label: "Space explorer",
    icon: FolderSearch,
    description:
      "Browse your folders by size. Follow the big ones, inspect their contents, and add the files you no longer need to your sweep.",
    alt: "Swept Space explorer showing folders sorted by size, with folder navigation and cleanup classifications.",
  },
  {
    id: "review",
    title: "Make the call",
    label: "Cleanup review",
    icon: ShieldCheck,
    description:
      "Review your selected files together. Clean permanently to reclaim space, or choose Trash when you want a way back.",
    alt: "Swept cleanup review listing selected items, their sizes, and the confirmation required for permanent cleanup.",
  },
];
const activeTour = ref(0);
const current = computed(() => tour[activeTour.value]!);
const shot = (id: string) =>
  `${import.meta.env.BASE_URL}screenshots/${id}-${theme.value}.jpg`;
const enlarged = ref<{ src: string; alt: string; title: string } | null>(null);
const dialog = ref<HTMLDialogElement>();
function enlarge(id: string, title: string, alt: string) {
  enlarged.value = { src: shot(id), title, alt };
  dialog.value?.showModal();
}
function closeImage() {
  dialog.value?.close();
  enlarged.value = null;
}
function setTheme() {
  theme.value = theme.value === "light" ? "dark" : "light";
}
watch(theme, (value) => {
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem("swept-site-theme", value);
  } catch {
    /* Appearance still works without storage. */
  }
});
const tools = [
  {
    name: "Node.js",
    detail: "Dependencies & package caches",
    icon: Package,
    color: "green",
  },
  {
    name: "Xcode",
    detail: "Builds & derived data",
    icon: Hammer,
    color: "blue",
  },
  {
    name: "Docker",
    detail: "Images, containers & volumes",
    icon: Container,
    color: "cyan",
  },
  {
    name: "Homebrew",
    detail: "Downloads & old versions",
    icon: Database,
    color: "gold",
  },
  {
    name: "Python",
    detail: "Environments & package caches",
    icon: Code2,
    color: "blue",
  },
  {
    name: "And the rest",
    detail: "Go, Rust, Gradle, app caches…",
    icon: Terminal,
    color: "violet",
  },
];
const faqs = [
  {
    question: "What can Swept clean?",
    answer:
      "Developer caches, generated build files, dependencies, selected Docker resources, and files you choose in Space explorer. Each item includes its path, size, and cleanup context. A “Rebuildable” label describes the content; it does not mean you no longer need it.",
  },
  {
    question: "Does cleaning send everything to Trash?",
    answer:
      "You choose. Clean now permanently removes reviewed files. Move to Trash is a separate option; those files remain recoverable until you empty Trash in Finder. Docker and other tool-managed cleanup use the tool’s own removal commands.",
  },
  {
    question: "What about browser logins and personal files?",
    answer:
      "Swept targets known browser cache folders and protects recognised browser profile and login-storage locations. It does not treat an entire browser folder as disposable. Other files need your review, and nothing is selected automatically.",
  },
  {
    question: "Does Docker need to be running?",
    answer:
      "The storage estimate for standard Docker Desktop and OrbStack disk files works while the engine is stopped. Inspecting and cleaning individual images, containers, build cache, or volumes requires your local engine to be running.",
  },
  {
    question: "Will it work on my Mac?",
    answer:
      "We are preparing a Universal download for Apple Silicon and 64-bit Intel Macs. Both architectures compile. The oldest supported macOS version is still being verified and will be listed with the first public release.",
  },
  {
    question: "Do I need Full Disk Access?",
    answer:
      "You can start without it. Swept scans accessible locations and explains any permission failures. If you want to inspect a location macOS blocks, Preferences shows how to grant access. Your files are scanned locally; Swept does not upload their contents.",
  },
];
function galleryKeys(event: KeyboardEvent) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  activeTour.value =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tour.length - 1
        : (activeTour.value +
            (event.key === "ArrowRight" ? 1 : -1) +
            tour.length) %
          tour.length;
  document.getElementById(`tour-tab-${activeTour.value}`)?.focus();
}
onMounted(() => {
  try {
    const saved = localStorage.getItem("swept-site-theme");
    if (saved === "dark" || saved === "light") theme.value = saved;
  } catch {
    /* Use the default theme. */
  }
});
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header shell">
    <a class="wordmark" href="#" aria-label="Swept home"
      ><img :src="icon" alt="" width="35" height="35" />Swept<span class="spark"
        >✦</span
      ></a
    >
    <nav aria-label="Main navigation">
      <a href="#how-it-works">The walkthrough</a
      ><a href="#questions">Good to know</a
      ><a :href="repo" class="github-link"
        ><GitFork :size="17" /> GitHub <ArrowUpRight :size="13"
      /></a>
    </nav>
    <div class="header-actions">
      <button
        class="icon-button theme-toggle"
        :aria-label="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`"
        @click="setTheme"
      >
        <Moon v-if="theme === 'light'" :size="18" /><Sun
          v-else
          :size="18"
        /></button
      ><a href="#download" class="header-download"
        >Get Swept <ArrowDownToLine :size="15"
      /></a>
    </div>
  </header>
  <main id="main">
    <section class="hero shell" aria-labelledby="hero-title">
      <p class="eyebrow hero-eyebrow">
        <span class="status-dot" /> A MAC CLEANER FOR DEVELOPERS
      </p>
      <h1 id="hero-title">
        A little room<br />to <span>build.</span
        ><svg class="hero-spark" viewBox="0 0 40 40" aria-hidden="true">
          <path
            d="M20 0C20 14 26 20 40 20C26 20 20 26 20 40C20 26 14 20 0 20C14 20 20 14 20 0Z"
          />
        </svg>
      </h1>
      <p class="hero-description">
        Your tools leave things behind.<br class="mobile-break" />
        Swept helps you see what’s there,<br class="desktop-break" />
        understand what it is, and clear what you no longer need.
      </p>
      <div class="hero-actions">
        <ActionLink href="#download"
          ><ArrowDownToLine :size="19" /> Get Swept for Mac</ActionLink
        ><a class="text-link" href="#how-it-works"
          >See how it works <ArrowDown :size="16"
        /></a>
      </div>
      <p class="hero-note">On your Mac. Under your control.</p>
      <div class="hero-preview">
        <AppShot
          :src="shot('overview')"
          :alt="tour[0]!.alt"
          label="Overview"
          eager
          @expand="enlarge('overview', 'Overview', tour[0]!.alt)"
        />
      </div>
      <div class="preview-caption">
        <span><span class="tiny-dot" /> THE ACTUAL APP, WITH SAMPLE DATA</span
        ><span>Light or dark. Your kind of workspace.</span>
      </div>
    </section>

    <section class="tools-section shell" aria-labelledby="tools-title">
      <div class="tools-heading">
        <p class="eyebrow">BUILT AROUND YOUR TOOLCHAIN</p>
        <h2 id="tools-title">
          Small leftovers.<br />A surprisingly big footprint.
        </h2>
        <p>
          Package installs. Test builds. One more container.<br />It adds up.
          Swept knows where to look.
        </p>
      </div>
      <div class="tools-grid">
        <div v-for="tool in tools" :key="tool.name" class="tool">
          <span :class="['tool-icon', tool.color]"
            ><component :is="tool.icon" :size="23"
          /></span>
          <div>
            <h3>{{ tool.name }}</h3>
            <p>{{ tool.detail }}</p>
          </div>
        </div>
      </div>
    </section>

    <section
      id="how-it-works"
      class="tour-section section-space"
      aria-labelledby="tour-title"
    >
      <div class="shell">
        <SectionIntro
          title-id="tour-title"
          eyebrow="A CLOSER LOOK"
          title="Less guesswork. More space."
          description="From the big picture to the exact files. Nothing gets swept away without your say."
        />
        <div
          class="tour-tabs"
          role="tablist"
          aria-label="Explore Swept"
          @keydown="galleryKeys"
        >
          <button
            v-for="(step, index) in tour"
            :id="`tour-tab-${index}`"
            :key="step.id"
            role="tab"
            :aria-selected="activeTour === index"
            :aria-controls="`tour-panel-${index}`"
            :tabindex="activeTour === index ? 0 : -1"
            :class="{ active: activeTour === index }"
            @click="activeTour = index"
          >
            <span class="step-number">0{{ index + 1 }}</span
            ><component :is="step.icon" :size="18" /><span>{{
              step.title
            }}</span>
          </button>
        </div>
        <div
          :id="`tour-panel-${activeTour}`"
          class="tour-panel"
          role="tabpanel"
          :aria-labelledby="`tour-tab-${activeTour}`"
          tabindex="0"
        >
          <div class="tour-description">
            <p>{{ current.description }}</p>
            <span>{{ String(activeTour + 1).padStart(2, "0") }} / 03</span>
          </div>
          <AppShot
            :src="shot(current.id)"
            :alt="current.alt"
            :label="current.label"
            @expand="enlarge(current.id, current.label, current.alt)"
          />
        </div>
        <p class="tour-caption">
          Real Swept screens. Sample files and sizes. Click any screenshot for a
          closer look.
        </p>
      </div>
    </section>

    <section
      class="principles shell section-space"
      aria-labelledby="principles-title"
    >
      <SectionIntro
        title-id="principles-title"
        eyebrow="YOUR FILES. YOUR CALL."
        title="A cleaner that shows its work."
        description="The useful details are right there, so you can make the decision."
      />
      <div class="principles-grid">
        <article>
          <LockKeyhole :size="25" />
          <h3>Local stays local.</h3>
          <p>
            Scanning and cleanup happen on your Mac. No file uploads. No account
            to create. No telemetry.
          </p>
        </article>
        <article>
          <FolderSearch :size="25" />
          <h3>Details before decisions.</h3>
          <p>
            See the path, size, and kind of content. Select across categories
            and review your files together.
          </p>
        </article>
        <article>
          <ShieldCheck :size="25" />
          <h3>You choose what goes.</h3>
          <p>
            Nothing is preselected. Swept checks your selection again before
            cleanup and reports what happened.
          </p>
        </article>
      </div>
    </section>

    <section
      id="download"
      class="download-section shell"
      aria-labelledby="download-title"
    >
      <div class="download-copy">
        <img :src="icon" width="72" height="72" alt="Swept app icon" />
        <p class="eyebrow">MAKE ROOM FOR WHAT’S NEXT</p>
        <h2 id="download-title">Your next project<br />could use the space.</h2>
        <p>A small app for the things that add up.</p>
      </div>
      <ReleaseDownloads :catalog="catalog" />
    </section>

    <section
      id="questions"
      class="faq-section shell section-space"
      aria-labelledby="questions-title"
    >
      <div>
        <p class="eyebrow">BEFORE YOUR FIRST SWEEP</p>
        <h2 id="questions-title">Good to know.</h2>
        <p>Clear answers.<br />Just like the app.</p>
      </div>
      <div class="faq-list">
        <details v-for="faq in faqs" :key="faq.question">
          <summary>{{ faq.question }}<ChevronDown :size="18" /></summary>
          <p>{{ faq.answer }}</p>
        </details>
      </div>
    </section>
  </main>
  <footer class="site-footer shell">
    <a class="wordmark" href="#" aria-label="Swept home"
      ><img :src="icon" width="29" height="29" alt="" />Swept<span class="spark"
        >✦</span
      ></a
    >
    <p>A little room to build.</p>
    <div>
      <a href="#questions">How cleanup works <ArrowUpRight :size="12" /></a
      ><a :href="`${repo}/issues`"
        >Report an issue <ArrowUpRight :size="12" /></a
      ><a :href="repo">GitHub <ArrowUpRight :size="12" /></a>
    </div>
    <span class="footer-local"
      ><span class="status-dot" /> Local. Private. Yours.</span
    >
  </footer>
  <dialog
    ref="dialog"
    class="image-dialog"
    aria-label="App screenshot"
    @click="$event.target === dialog && closeImage()"
    @close="enlarged = null"
  >
    <template v-if="enlarged"
      ><div class="image-dialog-bar">
        <strong>{{ enlarged.title }}</strong
        ><span>Sample data</span
        ><button
          class="icon-button"
          aria-label="Close screenshot"
          @click="closeImage"
        >
          <X :size="22" />
        </button>
      </div>
      <div class="image-dialog-content">
        <img :src="enlarged.src" :alt="enlarged.alt" />
      </div>
    </template>
  </dialog>
</template>
