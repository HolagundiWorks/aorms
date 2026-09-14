---
title: Why AORMS is three portals, not one login screen
description: An architecture firm's own data, a material supplier's catalogue, and platform administration aren't the same audience. Treating them like one has real costs.
date: 2026-09-14
---

The easy version of a platform login is one screen, one account type, one dashboard that tries to be useful to everyone who might sign in. It's also the wrong version once you actually look at who's signing in and why — an architecture practice managing its own clients and projects, a material supplier managing a product catalogue, and platform staff keeping the whole system running are three genuinely different jobs, not three views on the same job.

AORMS splits them into three portals because the alternative — one undifferentiated login serving all three — creates real problems, not just an untidy interface.

## Identity Portal — for architects and studios

This is where a practice's own portable personal account lives: an `AORMS-U-` handle, usage hours, professional profile, and every studio you belong to. Create a studio here, or join one you already work with. A studio's own Office Hub — the actual client, project, and invoice data — is a separate login entirely; the Identity Portal is what carries your own professional identity across whichever studios you work with over a career, not any one studio's private records.

## ConnectDeX Portal — for material and interior suppliers

A genuinely separate audience with a genuinely separate need: list a product catalogue, get discovered by architecture practices searching for a specific finish, manage board members and contacts for the business itself. None of that belongs mixed into an architect's own Identity — a supplier's business has nothing to do with a studio's staff roster, and showing Studio-branded chrome to a business account (or ConnectDeX branding to an architect) would just be confusing for no reason.

## SysDeX — platform administration, independent of everything else

Platform staff — the people running AORMS itself — sign in here, on their own footing, independent of whether they happen to also be an architect with a studio or a supplier with a catalogue. That independence is deliberate: staff status was, for a while, layered directly onto the same account table as ordinary Identity users, which meant a support ticket handler's admin access and their personal architect identity were tangled together in the database. They're separated now — three real identity tables, not one table asked to mean three different things depending on which column happened to be set.

## The tradeoff, stated plainly

Splitting this cleanly means a person who's both an architect *and* runs a material supply business needs two separate logins — one per portal, not one login that quietly does both. We made that tradeoff on purpose rather than build a single identity that has to represent three incompatible relationships to the platform at once. A login that means one clear thing is worth more than a login that means three vague things.

*Sign in to the portal that's actually yours — [Identity](/identity), [ConnectDeX](/connectdex), or ask your platform admin about SysDeX.*
