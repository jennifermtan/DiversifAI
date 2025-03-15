## Introduction

DiversifAI is a text-to-image generative system that aims to enhance ideation by providing users with diverse generations. Currently, we are using Stable Diffusion 2.1, that is accelerated using [AsyncDiff](https://github.com/czg1225/AsyncDiff).

## Getting Started

### Prerequisites

- Node.js 18.18 or later
- Conda 25.1.0 or later

### Download Requirements

```bash
# clone the AsyncDiff library as a submodule
git submodule update --init --recursive

# create an activate a python environment
conda create --prefix ./env python=3.10
conda activate ./env

# install python packages
pip install -r requirements.txt

# install node packages
npm install
```

## Running Locally 🚀

First, run the backend server:

```bash
python backend/server.py
```

Then, run the development server:

```bash
npm run dev
```
