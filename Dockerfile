FROM frappe/bench:latest

USER non-root
# Set the working directory
WORKDIR /home/frappe

RUN bench init --skip-redis-config-generation --skip-assets --python "$(which python3)" frappe-bench
RUN /home/frappe/frappe-bench/env/bin/pip3 install gunicorn rq croniter

WORKDIR /home/frappe/frappe-bench


RUN bench get-app https://github.com/The-Commit-Company/frappe-types.git
RUN bench get-app https://github.com/The-Commit-Company/frappe_er_generator.git
RUN bench get-app clapgrow_app .

RUN bench new-site --db-root-password root --admin-password admin test_site
RUN bench --site test_site install-app clapgrow_app

EXPOSE 8000

# Start the Bench server
CMD ["bench", "start"]
