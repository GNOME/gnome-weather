# I chose to use recursive automake so I can use nobase_ and avoid
# 5 different directory declarations
SUBDIRS = icons

resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/$(PACKAGE_NAME).Application.data.gresource.xml)
$(PACKAGE_NAME).Application.data.gresource: $(PACKAGE_NAME).Application.data.gresource.xml $(resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = $(PACKAGE_NAME).Application.data.gresource

appsdir = $(datadir)/applications
apps_DATA = $(PACKAGE_NAME).Application.desktop

@INTLTOOL_DESKTOP_RULE@

gsettings_SCHEMAS = $(PACKAGE_NAME).Application.gschema.xml

@GSETTINGS_RULES@

appdatadir = $(datadir)/appdata
appdata_DATA = $(PACKAGE_NAME).Application.appdata.xml

@INTLTOOL_XML_RULE@

$(PACKAGE_NAME).Application.service: $(PACKAGE_NAME).Application.service.in
	$(AM_V_GEN) sed \
		-e "s|[@]PACKAGE_NAME@|$(PACKAGE_NAME)|g" \
		-e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
		-e "s|[@]pkglibdir@|$(pkglibdir)|g" \
		$< > $@


servicedir = $(datadir)/dbus-1/services
service_DATA = $(PACKAGE_NAME).Application.service

searchproviderdir = $(datadir)/gnome-shell/search-providers
dist_searchprovider_DATA = $(PACKAGE_NAME).Application.search-provider.ini

EXTRA_DIST = \
	CREDITS \
	$(PACKAGE_NAME).Application.desktop.in \
	$(PACKAGE_NAME).Application.service.in \
	$(PACKAGE_NAME).Application.data.gresource.xml \
	$(gsettings_SCHEMAS) \
	$(PACKAGE_NAME).Application.appdata.xml.in \
	$(resource_files) \
	$(NULL)

CLEANFILES = \
	$(PACKAGE_NAME).Application.service \
	$(PACKAGE_NAME).Application.data.gresource \
	$(PACKAGE_NAME).Application.appdata.xml \
	$(apps_DATA) \
	*.valid \
	gschemas.compiled \
	$(NULL)

# For uninstalled use
all-local:
	$(GLIB_COMPILE_SCHEMAS) $(builddir)

-include $(top_srcdir)/git.mk
