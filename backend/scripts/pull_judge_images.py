"""Pull the Docker images submissions run in, so the first submission does not fail.

The worker runs this before starting. Docker skips images it already has.
"""

import docker

from app.services.languages import LANGUAGES


def main():
    client = docker.from_env()
    for image in sorted({language.image for language in LANGUAGES.values()}):
        print(f"Pulling {image}", flush = True)
        client.images.pull(image)


if __name__ == "__main__":
    main()
