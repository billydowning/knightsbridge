import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Knightsbridge Chess',
  tagline: 'Decentralized Chess Gaming on Solana',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.knightsbridge.games',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'knightsbridge-chess', // Usually your GitHub org/user name.
  projectName: 'knightsbridge', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Remove edit links since this is production documentation
          // editUrl: 'https://github.com/knightsbridge-chess/knightsbridge',
        },
        blog: false, // Disable blog for documentation-only site
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Knightsbridge Chess',
      logo: {
        alt: 'Knightsbridge Chess Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://knightsbridge.games',
          label: 'Play Chess',
          position: 'left',
        },
        {
          href: 'https://github.com/knightsbridge-chess',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Game Rules',
              to: '/docs/game-rules',
            },
            {
              label: 'Developer Guide',
              to: '/docs/developer-guide',
            },
            {
              label: 'FAQ',
              to: '/docs/faq',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/knightsbridge',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/knightsbridgechess',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Play Chess',
              href: 'https://knightsbridge.games',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/knightsbridge-chess',
            },
            {
              label: 'Solana Explorer',
              href: 'https://explorer.solana.com/address/F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Knightsbridge Chess. Built with ♟️ on Solana.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
