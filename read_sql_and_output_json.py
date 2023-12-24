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

def sql_query_to_list():
    cnx = connect_to_mysql(mysql_config)
    cursor = cnx.cursor()

    query = ("SELECT * FROM match_data ")

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

        total_list.append(player_dict)
    
    return total_list


data = sql_query_to_list()

with open('assets/data.json', 'w') as f:
    json.dump(data, f)

print("File written at assets/data.json")