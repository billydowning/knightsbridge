/**
 * Terms and Conditions Page
 * Professional legal document for Knightsbridge Chess platform
 */

import React from 'react';
import { useTheme } from '../App';
import { useTextSizes, useIsDesktopLayout, useIsMobile } from '../utils/responsive';

export const TermsPage: React.FC = () => {
  const { theme } = useTheme();
  const textSizes = useTextSizes();
  const isDesktopLayout = useIsDesktopLayout();
  const isMobile = useIsMobile();

  const sectionStyle = {
    marginBottom: isDesktopLayout ? '2rem' : '1.5rem'
  };

  const headingStyle = {
    fontSize: isDesktopLayout ? '1.5rem' : '1.25rem',
    fontWeight: '600',
    color: theme.text,
    marginBottom: '1rem',
    borderBottom: `2px solid ${theme.primary}`,
    paddingBottom: '0.5rem'
  };

  const subHeadingStyle = {
    fontSize: isDesktopLayout ? '1.25rem' : '1.1rem',
    fontWeight: '600',
    color: theme.text,
    marginBottom: '0.75rem',
    marginTop: '1.5rem'
  };

  const paragraphStyle = {
    fontSize: textSizes.body,
    lineHeight: 1.6,
    color: theme.text,
    marginBottom: '1rem'
  };

  const listStyle = {
    fontSize: textSizes.body,
    lineHeight: 1.6,
    color: theme.text,
    marginBottom: '1rem',
    paddingLeft: '1.5rem'
  };

  return (
    <div style={{
      backgroundColor: theme.background,
      color: theme.text,
      minHeight: '100vh',
      fontFamily: 'Inter, Segoe UI, Roboto, system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: theme.surface,
        padding: isDesktopLayout ? '2rem' : '1.5rem',
        borderBottom: `1px solid ${theme.border}`,
        marginBottom: isDesktopLayout ? '3rem' : '2rem'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              color: theme.text,
              cursor: 'pointer',
              fontSize: textSizes.body,
              transition: 'all 0.2s ease'
            }}
          >
            <span>←</span>
            <span>Back to Chess</span>
          </button>
          <h1 style={{
            fontSize: isDesktopLayout ? '2rem' : '1.5rem',
            fontWeight: '600',
            margin: 0,
            color: theme.text
          }}>
            Terms and Conditions
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: isDesktopLayout ? '0 2rem' : '0 1rem',
        paddingBottom: '3rem'
      }}>
        
        {/* Last Updated */}
        <div style={{
          backgroundColor: theme.surface,
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: textSizes.small, color: theme.textSecondary }}>
            Last Updated: August 1, 2025
          </p>
        </div>

        {/* Introduction */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>1. Introduction</h2>
          <p style={paragraphStyle}>
            Welcome to Knightsbridge Chess ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your use of our decentralized chess gaming platform available at knightsbridge.games and any related services (collectively, the "Service").
          </p>
          <p style={paragraphStyle}>
            By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
          </p>
        </section>

        {/* Platform Overview */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>2. Platform Overview</h2>
          <p style={paragraphStyle}>
            Knightsbridge Chess is a blockchain-based chess gaming platform built on the Solana network that enables:
          </p>
          <ul style={listStyle}>
            <li>Skill-based chess matches between players</li>
            <li>SOL-denominated wagering through smart contracts</li>
            <li>Automated escrow and payout distribution</li>
            <li>Anti-cheat mechanisms and fair play enforcement</li>
            <li>Transparent game history and move validation</li>
          </ul>
        </section>

        {/* Eligibility */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>3. Eligibility</h2>
          <p style={paragraphStyle}>
            You must be at least 18 years old and legally capable of entering into binding contracts to use our Service. By using the Service, you represent and warrant that:
          </p>
          <ul style={listStyle}>
            <li>You are of legal age in your jurisdiction</li>
            <li>You have the legal capacity to enter into these Terms</li>
            <li>Your use of the Service is not prohibited by applicable law</li>
            <li>You will comply with all local, state, and federal laws regarding online gaming</li>
          </ul>
        </section>

        {/* Account and Wallet */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>4. Wallet Connection and Security</h2>
          <h3 style={subHeadingStyle}>4.1 Wallet Requirements</h3>
          <p style={paragraphStyle}>
            To use our Service, you must connect a compatible Solana wallet (such as Phantom, Backpack, or Solflare). You are solely responsible for:
          </p>
          <ul style={listStyle}>
            <li>Maintaining the security of your wallet and private keys</li>
            <li>All transactions and activities conducted through your wallet</li>
            <li>Ensuring you have sufficient SOL for gameplay and transaction fees</li>
          </ul>

          <h3 style={subHeadingStyle}>4.2 Security Best Practices</h3>
          <p style={paragraphStyle}>
            You acknowledge that blockchain transactions are irreversible and agree to:
          </p>
          <ul style={listStyle}>
            <li>Never share your private keys or seed phrases</li>
            <li>Verify all transaction details before approval</li>
            <li>Use only official wallet applications</li>
            <li>Report any unauthorized access immediately</li>
          </ul>
        </section>

        {/* Gaming Rules */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>5. Game Rules and Conduct</h2>
          <h3 style={subHeadingStyle}>5.1 Chess Rules</h3>
          <p style={paragraphStyle}>
            All games follow official FIDE (World Chess Federation) rules, including:
          </p>
          <ul style={listStyle}>
            <li>Standard piece movements and capturing rules</li>
            <li>Special moves: castling, en passant, pawn promotion</li>
            <li>Check, checkmate, and stalemate conditions</li>
            <li>Draw conditions: 50-move rule, insufficient material, threefold repetition</li>
          </ul>

          <h3 style={subHeadingStyle}>5.2 Fair Play</h3>
          <p style={paragraphStyle}>
            You agree to play fairly and not engage in:
          </p>
          <ul style={listStyle}>
            <li>Use of chess engines or computer assistance</li>
            <li>Collusion with other players</li>
            <li>Exploitation of bugs or technical issues</li>
            <li>Any form of cheating or unfair advantage</li>
          </ul>

          <h3 style={subHeadingStyle}>5.3 Time Controls</h3>
          <p style={paragraphStyle}>
            Games have configurable time limits. You forfeit the game if your time expires. Time controls are enforced automatically by the platform.
          </p>
        </section>

        {/* Financial Terms */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>6. Financial Terms</h2>
          <h3 style={subHeadingStyle}>6.1 Stakes and Wagering</h3>
          <p style={paragraphStyle}>
            Games require equal SOL stakes from both players, held in secure smart contract escrow until game completion.
          </p>

          <h3 style={subHeadingStyle}>6.2 Fees</h3>
          <p style={paragraphStyle}>
            We charge a 2% platform fee on the total pot, deducted automatically upon game completion. Winners receive 98% of the total pot.
          </p>

          <h3 style={subHeadingStyle}>6.3 Payouts</h3>
          <p style={paragraphStyle}>
            Payouts are automatically distributed by smart contract upon game completion:
          </p>
          <ul style={listStyle}>
            <li><strong>Win:</strong> Winner receives ~98% of total pot</li>
            <li><strong>Draw:</strong> Each player receives ~49% of total pot</li>
            <li><strong>Forfeit:</strong> Non-forfeiting player receives payout</li>
          </ul>

          <h3 style={subHeadingStyle}>6.4 Transaction Costs</h3>
          <p style={paragraphStyle}>
            You are responsible for all Solana network transaction fees (typically ~0.001 SOL per transaction).
          </p>
        </section>

        {/* Prohibited Activities */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>7. Prohibited Activities</h2>
          <p style={paragraphStyle}>
            You may not:
          </p>
          <ul style={listStyle}>
            <li>Violate any applicable laws or regulations</li>
            <li>Use automated systems or bots for gameplay</li>
            <li>Attempt to manipulate game outcomes</li>
            <li>Reverse engineer or exploit the platform</li>
            <li>Create multiple accounts to circumvent restrictions</li>
            <li>Engage in money laundering or illegal financial activities</li>
            <li>Harass, abuse, or threaten other users</li>
            <li>Distribute malware or harmful content</li>
          </ul>
        </section>

        {/* Intellectual Property */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>8. Intellectual Property</h2>
          <p style={paragraphStyle}>
            The Service and its original content, features, and functionality are owned by Knightsbridge Chess and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
        </section>

        {/* Privacy */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>9. Privacy and Data</h2>
          <p style={paragraphStyle}>
            We collect minimal personal information:
          </p>
          <ul style={listStyle}>
            <li>Wallet addresses for gameplay</li>
            <li>Game statistics and move history</li>
            <li>Technical data for platform improvement</li>
          </ul>
          <p style={paragraphStyle}>
            We do not collect personally identifiable information unless voluntarily provided. All game data is stored on decentralized infrastructure.
          </p>
        </section>

        {/* Risk Disclosure */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>10. Risk Disclosure</h2>
          <p style={paragraphStyle}>
            You acknowledge and accept the following risks:
          </p>
          <ul style={listStyle}>
            <li><strong>Smart Contract Risk:</strong> Bugs or vulnerabilities in smart contracts</li>
            <li><strong>Blockchain Risk:</strong> Network congestion or technical issues</li>
            <li><strong>Market Risk:</strong> SOL price volatility</li>
            <li><strong>Technical Risk:</strong> Platform downtime or connectivity issues</li>
            <li><strong>Regulatory Risk:</strong> Changes in applicable laws</li>
          </ul>
        </section>

        {/* Disclaimers */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>11. Disclaimers</h2>
          <p style={paragraphStyle}>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p style={paragraphStyle}>
            We do not guarantee uninterrupted service, error-free operation, or security of your funds or data.
          </p>
        </section>

        {/* Limitation of Liability */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>12. Limitation of Liability</h2>
          <p style={paragraphStyle}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL KNIGHTSBRIDGE CHESS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE.
          </p>
          <p style={paragraphStyle}>
            Our total liability shall not exceed the amount of fees paid by you in the 12 months preceding the claim.
          </p>
        </section>

        {/* Indemnification */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>13. Indemnification</h2>
          <p style={paragraphStyle}>
            You agree to indemnify and hold harmless Knightsbridge Chess from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        {/* Termination */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>14. Termination</h2>
          <p style={paragraphStyle}>
            We may terminate or suspend your access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the platform.
          </p>
        </section>

        {/* Governing Law */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>15. Governing Law</h2>
          <p style={paragraphStyle}>
            These Terms shall be governed by and construed in accordance with the laws of Delaware, United States, without regard to conflict of law provisions.
          </p>
        </section>

        {/* Changes to Terms */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>16. Changes to Terms</h2>
          <p style={paragraphStyle}>
            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on this page with a new "Last Updated" date.
          </p>
          <p style={paragraphStyle}>
            Your continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        {/* Contact */}
        <section style={sectionStyle}>
          <h2 style={headingStyle}>17. Contact Information</h2>
          <p style={paragraphStyle}>
            If you have any questions about these Terms, please contact us at:
          </p>
          <div style={{
            backgroundColor: theme.surface,
            padding: '1rem',
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            marginTop: '1rem'
          }}>
            <p style={{ margin: 0, fontSize: textSizes.body }}>
              <strong>Email:</strong> legal@knightsbridge.games<br/>
              <strong>Website:</strong> https://knightsbridge.games<br/>
              <strong>Documentation:</strong> https://docs.knightsbridge.games
            </p>
          </div>
        </section>

        {/* Acceptance */}
        <div style={{
          backgroundColor: theme.primary + '20',
          border: `2px solid ${theme.primary}`,
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          marginTop: '3rem'
        }}>
          <p style={{
            margin: 0,
            fontSize: isDesktopLayout ? '1.1rem' : '1rem',
            fontWeight: '600',
            color: theme.text
          }}>
            By using Knightsbridge Chess, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;