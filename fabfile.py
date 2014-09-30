import time
from fabric.api import run, execute, env

environment = "production"

env.use_ssh_config = True
env.hosts = ["unitedstates"]

branch = "mvp"
repo = "git@github.com:konklone/oversight.git"

username = "unitedstates"
home = "/home/unitedstates/oversight"
logs = "/home/unitedstates/oversight"
shared_path = "%s/shared" % home
versions_path = "%s/versions" % home
version_path = "%s/%s" % (versions_path, time.strftime("%Y%m%d%H%M%S"))
current_path = "%s/current" % home

# how many old releases to be kept at deploy-time
keep = 3

# port in the storm
port = 3000

# can be run only as part of deploy
def checkout():
  run('git clone -q -b %s %s %s' % (branch, repo, version_path))

def links():
  run("ln -s %s/config.js %s/config/config.js" % (shared_path, version_path))

# install node (and ruby?) dependencies
def dependencies():
  run("cd %s && npm install" % version_path)

# TODO: why cp instead of ln?
def make_current():
  run('rm -rf %s && cp -r %s %s' % (current_path, version_path, current_path))

def cleanup():
  versions = run("ls -x %s" % versions_path).split()
  # destroy all but the most recent X
  destroy = versions[:-keep]

  for version in destroy:
    command = "rm -rf %s/%s" % (versions_path, version)
    run(command)


## can be run on their own

def start():
  run("cd %s && NODE_ENV=%s forever -l %s/forever.log -a start app.js -p %i" % (current_path, environment, logs, port))

def stop():
  run("forever stop app.js -p %i" % port)

def restart():
  run("forever restart app.js -p %i" % port)

def deploy():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(restart)
  execute(cleanup)

def deploy_cold():
  execute(checkout)
  execute(links)
  execute(dependencies)
  execute(make_current)
  execute(start)
