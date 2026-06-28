$env:PYTHONPATH = "C:\Users\91801\AppData\Roaming\Python\Python312\site-packages"
$env:KERAS_HOME = Join-Path $PSScriptRoot ".keras"

Set-Location $PSScriptRoot
& "C:\Users\91801\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
