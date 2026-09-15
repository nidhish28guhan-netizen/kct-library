#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unit1, unit2, unit3
n1 = unit1.build(); n2 = unit2.build(); n3 = unit3.build()
print("built:", len(n1), len(n2), len(n3), "pages")
