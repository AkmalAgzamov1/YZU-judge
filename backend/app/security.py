from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)

if __name__ == "__main__":
    result = hash_password("aki chan")
    # print(result)
    verification = verify_password("noooo", result)
    print(verification)