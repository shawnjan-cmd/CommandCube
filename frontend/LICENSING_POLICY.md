# 🛡️ LICENSING POLICY - BOTLER PROJECT

**Status**: MANDATORY COMPLIANCE  
**Violation Impact**: Legal requirement to open-source entire codebase  
**Last Updated**: 2026-03-25

---

## ⚠️ CRITICAL: GPL CODE IS FORBIDDEN

**NEVER copy code licensed under GPL (General Public License) into this project.**

### Why GPL is Dangerous

**GPL is a "copyleft" license** - it legally "infects" any project that uses GPL code:

```
Your Code (Proprietary)
    ↓
+ GPL Code (even 10 lines)
    ↓
= ENTIRE PROJECT BECOMES GPL (forced open-source)
```

**Result**: You MUST:
- Release full source code publicly
- Allow anyone to copy, modify, redistribute
- Cannot sell as closed-source commercial app
- Lose all proprietary rights

### GPL Variants to Avoid

**All GPL versions are forbidden**:
- ❌ GPL v1
- ❌ GPL v2
- ❌ GPL v3
- ❌ AGPL (Affero GPL - even stricter)
- ❌ LGPL (Lesser GPL - still risky for mobile apps)

---

## ✅ APPROVED LICENSES

**Only use code from these permissive licenses:**

### 1. MIT License ✅
**Most Common, Safest Choice**

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software... to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software...
```

**What it means**:
- ✅ Use in commercial apps
- ✅ Keep your code closed-source
- ✅ Modify without releasing changes
- ✅ No "viral" effect
- ⚠️ Must include original license text in your app

**Examples**: React, Express.js, jQuery, Bootstrap

### 2. Apache 2.0 License ✅
**Enterprise-Grade, Patent Protection**

```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License...
Subject to the terms and conditions of this License, each Contributor hereby
grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free,
irrevocable copyright license to reproduce, prepare Derivative Works of,
publicly display, publicly perform, sublicense, and distribute the Work...
```

**What it means**:
- ✅ Use in commercial apps
- ✅ Keep your code closed-source
- ✅ Patent protection included
- ✅ No "viral" effect
- ⚠️ Must include NOTICE file and license text

**Examples**: Android, Kubernetes, TensorFlow, Apache HTTP Server

### 3. BSD License (2-Clause or 3-Clause) ✅
**Simple, Permissive**

```
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met...
```

**What it means**:
- ✅ Use in commercial apps
- ✅ Keep your code closed-source
- ✅ Modify without releasing changes
- ✅ No "viral" effect
- ⚠️ Must include copyright notice

**Examples**: FreeBSD, OpenBSD, nginx

### 4. ISC License ✅
**Simplest, Most Permissive**

```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted...
```

**What it means**:
- ✅ Use in commercial apps
- ✅ Keep your code closed-source
- ✅ Minimal restrictions

**Examples**: Node.js core modules, many npm packages

### 5. Public Domain / Unlicense / CC0 ✅
**No Restrictions**

```
This is free and unencumbered software released into the public domain.
```

**What it means**:
- ✅ No attribution required
- ✅ Use however you want
- ✅ No license compliance needed

---

## 🔍 HOW TO CHECK LICENSES

### Method 1: GitHub Repository
```
1. Go to repository page
2. Look for "License" badge in right sidebar
3. Click to view full license text
4. Check license name at top
```

**Good Example**:
```
📄 LICENSE
MIT License

Copyright (c) 2024 Author Name
Permission is hereby granted, free of charge...
```

**Bad Example**:
```
📄 LICENSE
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007
❌ STOP - DO NOT USE THIS CODE
```

### Method 2: npm Package
```bash
# Check package.json
cat node_modules/package-name/package.json | grep "license"

# Good:
"license": "MIT"  ✅

# Bad:
"license": "GPL-3.0"  ❌
```

### Method 3: File Headers
```python
# Good:
# Licensed under the MIT License
# See LICENSE file in the project root

# Bad:
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License
```

### Method 4: Use License Checker Tools
```bash
# npm
npx license-checker --summary

# Python
pip install pip-licenses
pip-licenses --summary
```

---

## 🚨 WHAT TO DO IF YOU FIND GPL CODE

### Scenario 1: Already Used GPL Code

**IMMEDIATE ACTIONS**:
1. ❌ **DELETE ALL GPL CODE** from codebase
2. 🔍 Search for similar MIT/Apache implementations
3. ✍️ Rewrite functionality from scratch (clean room)
4. 🧪 Test replacement thoroughly
5. 📝 Document what was changed

**Example**:
```
❌ Found GPL library for PDF generation
↓
✅ Switch to MIT-licensed alternative (e.g., pdfkit)
↓
✅ Rewrite integration code
↓
✅ Test PDF generation works
```

### Scenario 2: Want Feature from GPL Project

**CORRECT APPROACH**:
1. 🚫 **DO NOT copy code**
2. 📚 Read GPL code to understand algorithm/approach
3. 📝 Write notes in your own words
4. 💻 Implement from scratch in clean room (no GPL code visible)
5. 🧪 Test implementation independently

**This is "clean room design" - legally safe!**

### Scenario 3: Uncertain License

**Default Rule**: **If unsure, DON'T USE IT!**

1. 🔍 Research license thoroughly
2. 📧 Contact author for clarification
3. 🔄 Find alternative with clear MIT/Apache license
4. ✍️ Rewrite functionality yourself

---

## 📋 LICENSE COMPLIANCE CHECKLIST

### For Every External Code/Library Used:

- [ ] **Check license type** (GitHub, package.json, LICENSE file)
- [ ] **Verify it's MIT, Apache 2.0, BSD, or ISC**
- [ ] **Confirm NO GPL/AGPL/LGPL**
- [ ] **Add to THIRD_PARTY_LICENSES.md** (list all used libraries)
- [ ] **Include required notices** (copyright, license text)
- [ ] **Document source** (where code came from)

### THIRD_PARTY_LICENSES.md Template:

```markdown
# Third-Party Licenses

## react-native (MIT)
Copyright (c) Meta Platforms, Inc. and affiliates.
Source: https://github.com/facebook/react-native
License: MIT

## expo (MIT)
Copyright (c) 2015-present 650 Industries, Inc.
Source: https://github.com/expo/expo
License: MIT

## @supabase/supabase-js (MIT)
Copyright (c) 2020 Supabase
Source: https://github.com/supabase/supabase-js
License: MIT

[Continue for all dependencies...]
```

---

## 🎯 RESEARCH GUIDELINES

### When Browsing GitHub for Ideas

**✅ DO**:
- Read GPL code to understand concepts
- Learn algorithms and design patterns
- Take notes in your own words
- Implement functionality from scratch
- Use MIT/Apache alternatives

**❌ DON'T**:
- Copy-paste GPL code
- Translate GPL code line-by-line
- Include GPL snippets "just to test"
- Assume small amounts are okay
- Think "no one will notice"

### Example Research Flow

**Goal**: Add AST-based script analysis

**❌ WRONG APPROACH**:
```python
# Found on GitHub (GPL-licensed)
def analyze_script(code):
    tree = ast.parse(code)
    # [50 lines of GPL code]
    return analysis

# Copy-paste into Botler ← ILLEGAL!
```

**✅ CORRECT APPROACH**:
```python
# Research GPL code:
# - Uses ast.parse() to build syntax tree
# - Walks tree to find dangerous operations
# - Scores risk based on operation types

# Now implement yourself (clean room):
def analyze_script(code):
    tree = ast.parse(code)
    dangerous_ops = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # Check for system calls
            if hasattr(node.func, 'id') and node.func.id in DANGER_FUNCS:
                dangerous_ops.append(...)
    
    return dangerous_ops
```

**Key Difference**: Your own implementation, inspired by concept (not copied code)

---

## 🔐 PROTECTING BOTLER'S IP

### Why This Matters

**Botler contains proprietary innovations**:
1. Phi-NEXUS Bridge Protocol (DELTA+SIGMA+FUSE+OMEGA fused pipeline)
2. SIGMA-NET Relay Crawler (phone teleports crawl through PC)
3. Quantum Link Harvester (entangled graph traversal URL discovery)
4. OMEGA Loop Auto-Growth Engine (3-layer 24/7 KB expansion)
5. Lambda Scan (LAMBDA SCAN) remote PC filesystem scanner
6. Omega Scanner Daemon (self-healing 8-min cycle monitor)
7. Persistent Checkpoint System (SQLite resume on restart)
8. Behavioural Profiling Engine (user_topics priority queue)
9. Nexus Cosmetic Pack System (full app re-skin via CosmeticContext)
10. Zero Hardcode Discovery (4-method IP + 20-port auto-detect)
11. Auto-Save AI Scripts (silent Python code detection from chat)
12. Pip Auto-Install + Retry Engine (ModuleNotFoundError recovery)
13. OmegaFingerprint Execution Learning (imports posted to KB per run)

**If GPL code is used → ALL of this becomes open-source!**

**Loss of Competitive Advantage**:
- ❌ Anyone can copy your innovations
- ❌ Cannot sell as proprietary software
- ❌ Cannot prevent competitors from using your code
- ❌ Lose patent/trademark protection

### Commercial Impact

**Scenario**: App becomes popular, generates revenue

**With GPL Contamination**:
- ⚠️ Competitor finds GPL code in your app
- ⚠️ Files copyright complaint
- ⚠️ Forces you to open-source entire codebase
- ⚠️ Competitor clones your app legally
- ⚠️ You lose market position
- ⚠️ Cannot enforce IP rights

**Without GPL (Clean MIT/Apache)**:
- ✅ Keep code proprietary
- ✅ Sell commercially
- ✅ License to partners
- ✅ Enforce IP rights
- ✅ Prevent cloning

---

## 📜 LEGAL DISCLAIMER

**I am an AI assistant, not a lawyer.**

**This document provides general guidance but is NOT legal advice.**

**For legal matters**:
- Consult a licensed attorney
- Review licenses with IP lawyer before major releases
- Consider patent/trademark protection for innovations

**Key Principle**:
> "When in doubt, use MIT/Apache or write it yourself."

---

## ✅ SUMMARY

**License Tier List**:

| License | Status | Risk | Use Case |
|---------|--------|------|----------|
| MIT | ✅ SAFE | None | Default choice |
| Apache 2.0 | ✅ SAFE | None | Patent protection needed |
| BSD 2/3-Clause | ✅ SAFE | None | Simple projects |
| ISC | ✅ SAFE | None | Minimal restrictions |
| Public Domain | ✅ SAFE | None | No attribution needed |
| LGPL | ⚠️ RISKY | Medium | Avoid for mobile apps |
| GPL v2/v3 | ❌ FORBIDDEN | HIGH | Forces open-source |
| AGPL | ❌ FORBIDDEN | CRITICAL | Even stricter GPL |

**Golden Rules**:
1. 🚫 **NEVER use GPL code**
2. ✅ **Prefer MIT/Apache 2.0**
3. 🔍 **Check licenses before using**
4. 📝 **Document all third-party code**
5. ⚖️ **When unsure, consult lawyer**

**Remember**:
> One line of GPL code can force your entire app open-source.  
> Protect Botler's proprietary status - check licenses first!

---

**Status**: ✅ MANDATORY POLICY

**Next Steps**:
1. Audit existing dependencies for GPL contamination
2. Create THIRD_PARTY_LICENSES.md listing all used libraries
3. Add license check to CI/CD pipeline
4. Train all developers on this policy

**For Questions**: Consult IP attorney specializing in software licensing
