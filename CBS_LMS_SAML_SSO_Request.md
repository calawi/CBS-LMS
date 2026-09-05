# CBS Staff LMS — SAML 2.0 SSO Configuration Request

**To:** CBS Identity Team (miniOrange)
**From:** CBS Staff LMS project team
**Re:** Register CBS Staff LMS as a SAML 2.0 Service Provider

## Overview

This document requests SAML 2.0 Single Sign-On (SSO) configuration for the **CBS Staff LMS**
application, following the same SAML onboarding process already used for other CBS applications
integrated with miniOrange. Please generate the LMS metadata the same way.

## 1. LMS Application Configuration Details (provided to miniOrange)

The following details should be registered in the CBS Identity Provider for CBS Staff LMS.

| Configuration Detail | Value |
|---|---|
| Protocol | SAML 2.0 |
| Application Name | CBS Staff LMS |
| Entity ID | `https://lms.centralbank.gov.so/api/auth/sso/metadata` |
| Base URL | `https://lms.centralbank.gov.so` |
| ACS URL (Reply URL) | `https://lms.centralbank.gov.so/api/auth/sso/callback` |
| NameID Format | Email Address (`urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`) — consistent with other existing CBS SAML integrations |
| IDP Initiated SSO | YES |
| SP Initiated SSO | YES |

## 2. Required from miniOrange — Identity Provider Details

The following details are required from the CBS Identity team to complete the SAML 2.0
configuration on the LMS side.

| Configuration Detail | Value (to be filled by miniOrange) |
|---|---|
| Metadata XML File | |
| Single Sign-In URL | |
| Single Sign-Out URL | |
| Client ID | |
| Tenant ID | |

### Response Attributes Required in SAML Response

Please include **both** of the following attributes in the SAML assertion — same attribute
names already used for other existing CBS SAML integrations:

| Attribute | Description |
|---|---|
| `givenname` | User's AD login ID (e.g. `abdirahman.hanafi`) |
| `emailaddress` | User's email address |

## 3. LMS login/role logic (for reference)

```
Valid AD user, existing LMS account    -> logs in, keeps current LMS role
Valid AD user, no existing LMS account -> rejected ("Invalid username or password")
```
