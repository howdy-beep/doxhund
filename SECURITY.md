# Security Policy

Doxhund is a defensive privacy tool: it helps a person find and remove their
own public records. A security bug here can expose the very information the
project exists to protect, so reports are taken seriously and handled
privately.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting: go to the **Security** tab of this repository
and choose **Report a vulnerability**. That opens a private advisory only the
maintainers can see.

If private reporting is not available on this repository, contact the
maintainer directly through their GitHub profile and say only that you have a
security report. Do not include the details in a public channel.

## What to include

- What the problem is and where it lives: file, function, or deployed URL.
- What an attacker gains, and what access they need to get it.
- Reproduction steps, ideally without real personal data.
- Whether you have disclosed it anywhere else.

Synthetic data is preferred. Please do not attach real names, addresses, phone
numbers, or identity documents to a report.

## What counts as a vulnerability here

In scope:

- Anything that leaks a visitor's typed name, city, or password off the device
  without their action (for example to the site's own origin or a third-party
  script).
- Cross-site scripting or HTML injection reachable from catalog data, URL
  parameters, or user input.
- Weaknesses in the vault's encryption, key derivation, or envelope handling
  that let ciphertext be read or tampered with without the password.
- Server-side issues in `engine/`: authentication bypass, quota or resource
  exhaustion, unbounded spend, or results that report a clean scan when the
  scan did not actually run.
- Credentials or personal data committed to the repository or published by
  the deployment.

Out of scope:

- Reports that require the maintainer to attack a third-party broker, or that
  ask us to test opt-out forms with someone else's identity.
- Missing hardening headers on their own, without a demonstrated impact.
- Automated scanner output with no reproduction.
- Requests for features that would make the tool usable against other people.

## What to expect

- Acknowledgement of the report within a few days.
- An assessment with severity and a proposed fix, or a clear reason it is not
  a vulnerability.
- Credit in the advisory when a fix ships, unless you prefer otherwise.
- No legal action against good-faith research that stays within this policy.

## Scope of this policy

This policy covers the code in this repository and the site it deploys. It does
not authorise testing against third-party data brokers or any service Doxhund
merely links to.

## Supported versions

The project ships a static site from `main`. There are no versioned releases
at this time, so fixes are made on `main` and deployed from there.
