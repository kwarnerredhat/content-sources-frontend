#!/bin/bash

# --------------------------------------------
# Export vars for helper scripts to use
# --------------------------------------------
export APP_NAME="content-sources"  # name of app-sre "application" folder this component lives in
export COMPONENT_NAME="content-sources-frontend"  # name of resourceTemplate component for deploy
# IMAGE should match the quay repo set by app.yaml in app-interface
export IMAGE="quay.io/cloudservices/content-sources-frontend"
export WORKSPACE=${WORKSPACE:-$APP_ROOT} # if running in jenkins, use the build's workspace
export APP_ROOT=$(pwd)

# set NODE_BUILD_VERSION based on nvmrc or default to 18
if [[ -n $(<.nvmrc) ]]; then
    export NODE_BUILD_VERSION=$(<.nvmrc)
else
    export NODE_BUILD_VERSION=18
fi

COMMON_BUILDER=https://raw.githubusercontent.com/RedHatInsights/insights-frontend-builder-common/master

# --------------------------------------------
# Options that must be configured by app owner
# --------------------------------------------
export IQE_PLUGINS="content-sources"
export IQE_MARKER_EXPRESSION="smoke and ui"
export IQE_FILTER_EXPRESSION=""
export IQE_ENV="ephemeral"
export IQE_SELENIUM="true"
export IQE_CJI_TIMEOUT="30m"
export DEPLOY_TIMEOUT="900"  # 15min
export DEPLOY_FRONTENDS="true"

set -exv

# bootstrap bonfire and it's config
CICD_URL=https://raw.githubusercontent.com/RedHatInsights/bonfire/master/cicd
curl -s "$CICD_URL/bootstrap.sh" > .cicd_bootstrap.sh && source .cicd_bootstrap.sh

# source is preferred to | bash -s in this case to avoid a subshell
source <(curl -sSL $COMMON_BUILDER/src/frontend-build.sh)

# reserve ephemeral namespace
source "${CICD_ROOT}/deploy_ephemeral_env.sh"

# Run smoke tests using a ClowdJobInvocation (preferred)
# The contents of this script can be found at:
# https://raw.githubusercontent.com/RedHatInsights/bonfire/master/cicd/cji_smoke_test.sh
export COMPONENT_NAME="content-sources-backend"
source "$CICD_ROOT/cji_smoke_test.sh"

# Post a comment with test run IDs to the PR
# The contents of this script can be found at:
# https://raw.githubusercontent.com/RedHatInsights/bonfire/master/cicd/post_test_results.sh
source "$CICD_ROOT/post_test_results.sh"
