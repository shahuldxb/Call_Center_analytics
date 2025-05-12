FROM python:3.12.3

WORKDIR /python

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .  # Only copy contents of the python folder

EXPOSE 5000

CMD ["python", "app.py"]
