gnome = import('gnome')
podir = join_paths(meson.source_root(), 'po')

data_conf = configuration_data()
data_conf.set('APP_ID', application_id)
data_conf.set('DATA_DIR', DATA_DIR)

message('Compiling resources')

gnome.compile_resources(
	application_id_stable + '.data',
	application_id_stable + '.data.gresource.xml',
	gresource_bundle: true,
	source_dir: '.',
	install_dir: DATA_DIR,
	install: true
)

gnome.compile_resources(
	application_id_stable + '.BackgroundService.data',
	application_id_stable + '.BackgroundService.data.gresource.xml',
	gresource_bundle: true,
	source_dir: '.',
	install_dir: DATA_DIR,
	install: true
)

# Installing the schema file
install_data(
	application_id_stable + '.gschema.xml',
	install_dir: 'share/glib-2.0/schemas'
)

# Building desktop file
msgfmt = find_program('msgfmt')
desktop_conf = configuration_data()
desktop_conf.set('APP_ID', application_id)
desktop = custom_target(
  'desktop-file',
  input: configure_file(
    input: '@0@.desktop.in.in'.format(application_id_stable),
    output: '@0@.desktop.in'.format(application_id_stable),
    configuration: desktop_conf,
  ),
  output: '@0@.desktop'.format(application_id),
  install: true,
  install_dir: join_paths(get_option('datadir'), 'applications'),
  command: [msgfmt, '--desktop',
    '--template', '@INPUT@', '-d', podir, '-o', '@OUTPUT@',
    '--keyword=X-Geoclue-Reason',
    '--keyword=Name', '--keyword=Comment', '--keyword=Keywords'
  ]
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
	input: application_id_stable + '.appdata.xml.in',
	output: application_id + '.appdata.xml',
	install: true,
	install_dir: join_paths(join_paths('share'), 'metainfo'),
	po_dir: join_paths(meson.source_root(), 'po')
)

# Validating app data
appstream_util = find_program('appstream-util', required: false)
if appstream_util.found()
	test(
		'validate-appdata', appstream_util,
		args: [
			'validate-relax', '--nonet', appdata.full_path()
		]
	)
endif

configure_file(
	input: application_id_stable + '.service.in',
	output: application_id + '.service',
	configuration: data_conf,
	install: true,
	install_dir: join_paths(get_option('datadir'), 'dbus-1', 'services')
)

configure_file(
	input: application_id_stable + '.BackgroundService.service.in',
	output: application_id + '.BackgroundService.service',
	configuration: data_conf,
	install: true,
	install_dir: join_paths(get_option('datadir'), 'dbus-1', 'services')
)

# Search Provider
install_data(
	application_id_stable + '.search-provider.ini',
	install_dir: 'share/gnome-shell/search-providers'
)

subdir('icons')
