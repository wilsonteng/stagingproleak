# Attempt mysql connection
import requests
import json
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv
import mysql.connector
import os
import logging
import time
from pathlib import Path
import ast

load_dotenv()
mysql_config = {
    'user': os.getenv("mysql_user"),
    'password': os.getenv("mysql_password"),
    'host': os.getenv("mysql_host"),
    'database': os.getenv("mysql_database"),
    'raise_on_warnings': True
    }

wave_values = {
    1 : 72,
    2 : 84,
    3 : 90,
}

unit_leak_dictionary = {
    "Crab" : 6,
    "Wale" : 7,
    "Hopper" : 5,
    "Snail" : 6,
    "Dragon Turtle" : 12,
    "Lizard" : 12,
    "Brute" : 15,
    "Fiend" : 18,
    "Hermit" : 20,
    "Dino" : 24
}

def find_units_used(input):
    units_used = set()
    for wave in input:
        for unit in wave:
            units_used.add(unit.split(":")[0])
    return units_used

def connect_to_mysql(config, attempts=3, delay=2):
    attempt = 1

    # Set up logger
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # Log to console
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Also log to a file
    file_handler = logging.FileHandler("cpy-errors.log")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler) 

    # Implement a reconnection routine
    while attempt < attempts + 1:
        try:
            return mysql.connector.connect(**config)
        except (mysql.connector.Error, IOError) as err:
            if (attempts is attempt):
              # Attempts to reconnect failed; returning None
                logger.info("Failed to connect, exiting without a connection: %s", err)
                return None
            logger.info(
                "Connection failed: %s. Retrying (%d/%d)...",
                err,
                attempt,
                attempts-1,
            )
            # progressive reconnect delay
            time.sleep(delay ** attempt)
            attempt += 1
    return None

def calculate_leak_percentages(data : list) -> int:
    """
    Takes in leak data and returns leak percentages as integer.
    """
    
    leak_percentages = []
    for wavenumber, wave in enumerate(data):
        wave_leak_value = 0
        for leaked_unit in wave:
            wave_leak_value += unit_leak_dictionary[leaked_unit]
            wave_leak_percent = round(wave_leak_value * 100 / wave_values[wavenumber + 1])
        leak_percentages.append(wave_leak_percent)

    return leak_percentages

def sql_query_to_list():
    cnx = connect_to_mysql(mysql_config)
    cursor = cnx.cursor()

    query = ("SELECT * FROM match_data ORDER BY BUILD_ID desc")

    cursor.execute(query)
    total_list = []

    for row in cursor:
        player_dict = {}
        player_dict["game_id"] = row[1]
        player_dict["version"] = row[2]
        player_dict["date"] = str(row[3]) #JSON Dumps does not like datetime object
        player_dict["queueType"] = row[4]
        player_dict['playerName'] = row[5]
        player_dict["legion"] = row[6]
        player_dict["buildPerWave"] = ast.literal_eval(row[7])
        player_dict["mercenariesReceivedPerWave"] = ast.literal_eval(row[8])
        player_dict["leaksPerWave"] = ast.literal_eval(row[9])

        player_dict["categories"] = list(find_units_used(player_dict["buildPerWave"]))
        player_dict["leakPercentages"] = calculate_leak_percentages(player_dict["leaksPerWave"])

        total_list.append(player_dict)
    
    return total_list

data = sql_query_to_list()

def Average(lst): 
    return sum(lst) / len(lst) 

sorted_data = sorted(data, key = lambda row : Average(row["leakPercentages"]) )

with open('assets/data.json', 'w') as f:
    json.dump(sorted_data, f)

print("File written at assets/data.json")