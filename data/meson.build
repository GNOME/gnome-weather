gnome = import('gnome')

data_conf = configuration_data()
data_conf.set('application_id', application_id)
data_conf.set('PACKAGE_NAME', meson.project_name())
data_conf.set('DATA_DIR', DATA_DIR)
data_conf.set('pkgdatadir', pkgdatadir)

message('Compiling resources')

gnome.compile_resources(
	application_id + '.Application.data',
	application_id + '.Application.data.gresource.xml',
	gresource_bundle: true,
	source_dir: '.',
	install_dir: DATA_DIR,
	install: true
)

gnome.compile_resources(
	application_id + '.BackgroundService.data',
	application_id + '.BackgroundService.data.gresource.xml',
	gresource_bundle: true,
	source_dir: '.',
	install_dir: DATA_DIR,
	install: true
)

# Installing the schema file
install_data(
	application_id + '.Application.gschema.xml',
	install_dir: 'share/glib-2.0/schemas'
)

# Building desktop file
desktop_conf = configuration_data()
desktop = i18n.merge_file(
	'desktop',
	input: 'org.gnome.Weather.Application.desktop.in',
	output: 'org.gnome.Weather.Application.desktop',
	po_dir: join_paths(meson.source_root(), 'po'),
	type: 'desktop',
	install: true,
	install_dir: join_paths(get_option('prefix'), get_option('datadir'), 'applications')
)

# Validating desktop file
desktop_file_validate = find_program('desktop-file-validate', required:false)
if desktop_file_validate.found()
	test (
		'Validate desktop file',
		desktop_file_validate,
		args: join_paths(meson.current_build_dir(), application_id + '.desktop')
	)
endif

# Building app data
appdata_conf = configuration_data()
appdata = i18n.merge_file(
	'appdata',
	input: 'org.gnome.Weather.appdata.xml.in',
	output: application_id + '.appdata.xml',
	install: true,
	install_dir: join_paths(join_paths('share'), 'metainfo'),
	po_dir: join_paths(meson.source_root(), 'po')
)


configure_file(
	input: application_id + '.Application.service.in',
	output: application_id + '.Application.service',
	configuration: data_conf,
	install: true,
	install_dir: join_paths(DATA_DIR, 'dbus-1', 'services')
)

configure_file(
	input: application_id + '.BackgroundService.service.in',
	output: application_id + '.BackgroundService.service',
	configuration: data_conf,
	install: true,
	install_dir: join_paths(DATA_DIR, 'dbus-1', 'services')
)

# Search Provider
install_data(
	application_id + '.Application.search-provider.ini',
	install_dir: 'share/gnome-shell/search-providers'
)

subdir('icons')
