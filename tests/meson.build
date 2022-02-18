if get_option('dogtail')
  pyexec = find_program('python3')
  test(
    'world_view',
    pyexec,
    args: [join_paths('tests', 'world_view.py')],
    workdir: meson.project_source_root()
  )
endif
