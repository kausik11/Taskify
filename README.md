<p align="center">
  <a href="https://www.clapgrow.com">
    <img src="clapgrow.png" alt="Clapgrow logo" height="100" />
  </a>

  <h3 align="center">Clapgrow: Empowering Growth, One Task at a Time!</h3>
  <p align="center">A custom application built on top of the Frappe Framework, a Python-based full-stack web application framework
    <br />
    <br />
    <br />
    <a href="https://clapgrow.com/"><strong>Learn More »</strong></a>
    <br />
  </p>
</p>

<p align="center">
  <a href="https://github.com/clapgrow/clapgrow_app_v2/blob/main/LICENSE">
    <img alt="license" src="https://img.shields.io/badge/license-Clapgrow_Proprietary-blue">
  </a>
  <a href="https://github.com/clapgrow/clapgrow_app_v2/stargazers" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/stars-1-brightgreen" alt="GitHub Stars">
  </a>
  <a href="https://github.com/clapgrow/clapgrow_app_v2/pulse" target="_blank" rel="noopener noreferrer">
    <img src="https://img.shields.io/badge/commits_15_per_month-blue" alt="Commits per Month">
  </a>
</p>

<br>
Your dream of building a world-class, system driven business that does not require your daily input is now possible! The secret system that Clapgrow makes accessible to small and medium companies is exactly what Fortune 500 companies use to grow successfully. Traditionally, these systems used to cost millions but is now accessible for the price of a few cups of coffee every month. To know how Clapgrow can help your business in just 12 weeks and destroy your competition. 
<hr>

## Built with

Clapgrow is built using the [Frappe Framework](https://frappeframework.com) - an open-source full stack development framework.

These are some of the tools it's built on:

- [Python](https://www.python.org)
- [Redis](https://redis.io/)
- [MariaDB](https://mariadb.org/)
- [Socket.io](https://socket.io/)

The frontend is built using React and the following tools:

- [frappe-react-sdk](https://github.com/nikkothari22/frappe-react-sdk) - simple React hooks to interface with a Frappe framework backend - built and maintained by The Commit Company.
- [shadcn](https://ui.shadcn.com/)
- [react-icons](https://react-icons.github.io)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/en-US/api)

## Installation

Since Clapgrow is a Frappe app, it can be installed via [frappe-bench](https://frappeframework.com/docs/v14/user/en/bench) on your local machine or on your production site.

Once you have [setup your bench](https://frappeframework.com/docs/v14/user/en/installation) and your [site](https://frappeframework.com/docs/v14/user/en/tutorial/install-and-setup-bench), you can install the app via the following commands:

```bash
bench get-app https://github.com/{username:password}@clapgrow/clapgrow_app_v2.git
```

```bash
bench --site <yoursite.name> install-app clapgrow_app
```

Post this, you can access Clapgrow on your Frappe site at the `/clapgrow` endpoint (e.g. https://yoursite.com/clapgrow).

### Local development setup

To set up your local development environment, make sure that you have enabled [developer mode](https://frappeframework.com/how-to-enable-developer-mode-in-frappe) in your Frappe site config.

You also need to disable CSRF (add `ignore_csrf: 1` in your `site_config.json`) since the React web server will not have any CSRF token in live reload mode. Please note that this is only for the local dev setup - not meant for Production.

You can start the React live web server by:

```bash
cd frappe-bench/apps/clapgrow_app
yarn dev
```

Your local dev server would be running at `http://localhost:8080`.

## Reporting Bugs

If you find any bugs, feel free to report them here on [GitHub Issues](https://github.com/clapgrow/clapgrow_app_v2/issues). Make sure you share enough information (app screenshots, browser console screenshots, stack traces, etc) for project maintainers to replicate your bug.

<hr>

## License

Clapgrow Proprietary License
