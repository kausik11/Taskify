# Security Policy

## Internal Security Guidelines

This document outlines security practices for our private ClapGrow application development team.

## Team Contacts

**Developers**: sourav@clapgrow.com, kausik.saha@clapgrow.com 
**Security Issues**: Raven #developers or email sourav@clapgrow.com, kausik.saha@clapgrow.com 

## Reporting Security Issues

Found a security concern? Here's what to do:

1. **Don't commit** sensitive data or known vulnerabilities
2. **Notify immediately** via Raven #developers or email
3. **Include**: Description, location in code, potential impact
4. **Document**: Create an issue in our private repo with [SECURITY] tag

## Automated Security Measures

Our CI/CD pipeline includes:
- **Secret scanning**: Prevents committed credentials
- **Static analysis**: Code security scanning before merge
- **Dependency checks**: Automated vulnerability detection
- **Container scanning**: Docker image security validation

## Development Security Rules

### Required Practices
- **All PRs** must pass security scans before merge
- **No secrets** in code - use environment variables
- **Code review** required for all changes
- **Strong passwords** for all accounts and services
- **2FA enabled** on GitHub and production accounts

### Forbidden Actions
- **No production data** in development/testing
- **No hardcoded credentials** anywhere in code
- **No bypassing** security checks or scans
- **No sharing** production credentials via insecure channels

## Environment Security

### Production Access
- Access limited to: sourav@clapgrow.com
- All production changes require approval
- Emergency access protocol documented separately

### Development Environment
- Use test data only
- Local environment variables for configuration
- Regular dependency updates via Dependabot

## Incident Response

### If Security Issue Found:
1. **Immediate**: Notify team in Raven #developers
2. **Document**: Create security issue in repo
3. **Assess**: Determine if production is affected
4. **Fix**: Prioritize based on severity
5. **Verify**: Test fix thoroughly before deployment

### Severity Levels:
- **Critical**: Production data at risk → Fix immediately
- **High**: Potential security vulnerability → Fix within 1 week  
- **Medium**: Security improvement needed → Fix in next sprint
- **Low**: Security best practice → Address when convenient

## Quick Reference

### Useful Security Resources
- [Frappe Security Guide](https://frappe.io/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- Our internal security scan results: GitHub Security tab

### Emergency Contacts
- **Sourav**: sourav@clapgrow.com
- **Kausik**: kausik.saha@clapgrow.com
- **Team Raven**: #developers
