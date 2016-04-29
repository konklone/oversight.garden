#!/bin/bash

# load virtualenv
cd $HOME/inspectors-general
source $HOME/.virtualenvs/inspectors/bin/activate

# set up rbenv
export PATH=$HOME/.rbenv/shims:$HOME/.rbenv/bin:$PATH
eval "$(rbenv init -)"

# get latest IG reports from all 'safe' scrapers
./igs --safe > $HOME/oversight/shared/log/igs-cron.log 2>&1

# load them into elasticsearch
cd $HOME/oversight/current && ./tasks/inspectors.js > $HOME/oversight/shared/log/load-cron.log 2>&1

# update the sitemap files
cd $HOME/oversight/current && rake sitemap:generate > $HOME/oversight/shared/log/sitemap-cron.log 2>&1
