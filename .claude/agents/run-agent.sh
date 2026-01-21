#!/bin/bash
# Agent Runner Script for Share Deck Manager
#
# Quick wrapper to run development agents
#
# Usage:
#   ./run-agent.sh design "Add deck filtering API"
#   ./run-agent.sh implementation "Implement user authentication"
#   ./run-agent.sh testing "Test deck CRUD operations"
#   ./run-agent.sh review "Review authentication code"
#   ./run-agent.sh debug "Fix Railway deployment error"
#   ./run-agent.sh workflow "Add deck search feature"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo -e "${BLUE}Share Deck Manager - Agent Runner${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 <agent|workflow> <task description>"
    echo ""
    echo "Agents:"
    echo "  design          - System architecture and design"
    echo "  implementation  - Code implementation"
    echo "  testing         - Test creation and QA"
    echo "  review          - Code review"
    echo "  debug           - Debugging and troubleshooting"
    echo "  workflow        - Run full workflow (design→impl→test→review)"
    echo ""
    echo "Examples:"
    echo "  $0 design 'Add deck filtering feature'"
    echo "  $0 implementation 'Implement OAuth login'"
    echo "  $0 testing 'Test deck CRUD endpoints'"
    echo "  $0 workflow 'Add user profile page'"
}

if [ $# -lt 2 ]; then
    print_usage
    exit 1
fi

COMMAND=$1
TASK=$2
CONTEXT=${3:-""}

case $COMMAND in
    design|implementation|testing|review|debug)
        echo -e "${GREEN}Running ${COMMAND} agent...${NC}"
        python3 "$SCRIPT_DIR/orchestrator.py" --agent "$COMMAND" --task "$TASK" ${CONTEXT:+--context "$CONTEXT"}
        ;;
    workflow)
        echo -e "${GREEN}Running full development workflow...${NC}"
        python3 "$SCRIPT_DIR/orchestrator.py" --workflow full --task "$TASK"
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$COMMAND'${NC}"
        print_usage
        exit 1
        ;;
esac
