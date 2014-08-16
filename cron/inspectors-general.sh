#!/bin/bash

# load virtualenv
cd $HOME/inspectors-general
source $HOME/.virtualenvs/inspectors/bin/activate

# load nvm
source $HOME/.nvm/nvm.sh

# get latest IG reports from all 'safe' scrapers
./igs --safe > $HOME/oversight/shared/log/igs-cron.log 2>&1

# load them into elasticsearch
cd $HOME/oversight/current && ./tasks/inspectors.js > $HOME/oversight/shared/log/load-cron.log 2>&1
