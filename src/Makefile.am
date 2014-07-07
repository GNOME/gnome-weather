NULL =

appdir = $(pkgdatadir)
nodist_app_SCRIPTS = org.gnome.Weather.Application org.gnome.Weather.BackgroundService

app_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).Application.src.gresource.xml)
$(PACKAGE_NAME).Application.src.gresource: $(PACKAGE_NAME).Application.src.gresource.xml $(app_resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

service_resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).BackgroundService.src.gresource.xml)
$(PACKAGE_NAME).BackgroundService.src.gresource: $(PACKAGE_NAME).BackgroundService.src.gresource.xml $(service_resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = $(PACKAGE_NAME).Application.src.gresource $(PACKAGE_NAME).BackgroundService.src.gresource

org.gnome.Weather.Application: org.gnome.Weather.Application.in
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	@chmod +x $@

org.gnome.Weather.BackgroundService: org.gnome.Weather.BackgroundService.in
	$(AM_V_GEN) sed \
		-e "s|[@]GJS@|$(GJS)|g" \
		-e "s|[@]PACKAGE_VERSION@|$(PACKAGE_VERSION)|g" \
		-e "s|[@]prefix@|$(prefix)|g" \
		-e "s|[@]libdir@|$(libdir)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		$< > $@
	@chmod +x $@

EXTRA_DIST = \
	$(PACKAGE_NAME).Application.in \
	$(PACKAGE_NAME).Application.src.gresource.xml \
	$(PACKAGE_NAME).BackgroundService.in \
	$(PACKAGE_NAME).BackgroundService.src.gresource.xml \
	$(app_resource_files) \
	$(service_resource_files) \
	$(NULL)

CLEANFILES = \
	$(PACKAGE_NAME).Application \
	$(PACKAGE_NAME).Application.src.gresource \
	$(PACKAGE_NAME).BackgroundService \
	$(PACKAGE_NAME).BackgroundService.src.gresource \
	$(NULL)

install-exec-hook:
	$(MKDIR_P) $(DESTDIR)$(bindir)
	$(LN_S) $(appdir)/$(PACKAGE_NAME).Application $(DESTDIR)$(bindir)/$(PACKAGE_TARNAME)
uninstall-hook:
	-rm -f $(DESTDIR)$(bindir)/$(PACKAGE_TARNAME)

-include $(top_srcdir)/git.mk
