---
layout: post
title: Use Kaggle API On Google Colab
date:   2019-10-01 20:00:00 +0300
categories: [MachineLearning]
tags: [Kaggle] 
intro: Use Google Colab to play Kaggle without uploading or pasting token file every time.
---

There is a discussion about how to use Kaggle API easily on Google Colab: https://www.kaggle.com/general/51898

I modified @nanokaggle 's answer. In this way, I only need to upload this file once. 

```
# mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Kaggle reads token file from ~/.kaggle
!mkdir -p ~/.kaggle

# copy kaggle token file from Google Drive to that folder
# use double quotation marks if there is space in the path
!cp "/content/drive/My Drive/Colab Notebooks/kaggle/kaggle.json" ~/.kaggle/
!chmod 600 ~/.kaggle/kaggle.json

# it should return "kaggle.json"
!ls ~/.kaggle

# now we are good to go
!pip install kaggle
!kaggle competitions download -c digit-recognizer
```