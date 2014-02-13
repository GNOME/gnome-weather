NULL =

appdir = $(pkgdatadir)
nodist_app_SCRIPTS = org.gnome.Weather.Application

resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).src.gresource.xml)
$(PACKAGE_NAME).src.gresource: $(PACKAGE_NAME).src.gresource.xml $(resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = $(PACKAGE_NAME).src.gresource

# Legacy, until we can depend on package.js provided by gjs
jsdir = $(pkgdatadir)
dist_js_DATA = package.js

org.gnome.Weather.Application: org.gnome.Weather.Application.in
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	@chmod +x $@

EXTRA_DIST = \
	$(PACKAGE_NAME).in \
	$(PACKAGE_NAME).src.gresource.xml \
	$(resource_files) \
	$(NULL)

CLEANFILES = \
	$(PACKAGE_NAME) \
	$(PACKAGE_NAME).src.gresource \
	$(NULL)

install-exec-hook:
	$(MKDIR_P) $(DESTDIR)$(bindir)
	$(LN_S) $(appdir)/$(PACKAGE_NAME) $(DESTDIR)$(bindir)/$(PACKAGE_TARNAME)
uninstall-hook:
	-rm -f $(DESTDIR)$(bindir)/$(PACKAGE_NAME)

-include $(top_srcdir)/git.mk
