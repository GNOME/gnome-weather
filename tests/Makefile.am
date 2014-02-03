include $(top_srcdir)/glib-tap.mk

dogtail_tests = \
	world_view.py

if ENABLE_DOGTAIL
dist_test_scripts = $(dogtail_tests)
dist_test_data = testutil.py
else
EXTRA_DIST += testutil.py $(dogtail_tests)
endif

include $(top_srcdir)/git.mk
