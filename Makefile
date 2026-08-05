# Language-agnostic quality facade.
# CI, hooks, and agents only ever call these targets — the implementation comes
# from exactly one include in stacks/. Uncomment the line matching your project:

# include stacks/python.mk
# include stacks/typescript.mk

.PHONY: check
check: lint typecheck test coverage   ## everything a change must pass

# Every stacks/*.mk must implement:
#   setup        install dev dependencies
#   lint         zero-warnings lint
#   typecheck    static types
#   test         run test suite
#   coverage     tests with 100% line+branch gate (fails below)
#   mutate       mutation testing with threshold gate
#   audit        dependency vulnerability scan
#   format       format the whole tree
#   format-file  format one file: make format-file FILE=path
