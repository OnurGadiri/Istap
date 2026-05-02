BACKEND
python -m venv .venv (in backend folder)
.\.venv\Scripts\Activate.ps1
If the ‘running scripts is disabled’ error appears, do this once (with Administrator privileges):
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
then again write .\.venv\Scripts\Activate.ps1 this command;
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
FRONTEND
cd frontend
npm install
npm run dev
