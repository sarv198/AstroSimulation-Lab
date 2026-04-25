import math
import os

import pygame

pygame.init()

WIDTH, HEIGHT = 800, 600
win = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Gravitational Slingshot Effect")

# Load assets next to this script (works even if cwd is the repo root)
_ASSET_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_scaled_bg():
    for name in ("background.jpg", "background.jpeg", "background.png"):
        path = os.path.join(_ASSET_DIR, name)
        if os.path.isfile(path):
            img = pygame.image.load(path)
            return pygame.transform.scale(img, (WIDTH, HEIGHT)).convert()
    surf = pygame.Surface((WIDTH, HEIGHT))
    surf.fill((10, 10, 28))
    return surf


def _load_planet_sprite():
    for name in ("jupiter.png", "jupiter.jpg", "planet.png"):
        path = os.path.join(_ASSET_DIR, name)
        if os.path.isfile(path):
            img = pygame.image.load(path)
            out = pygame.transform.scale(img, (PLANET_SIZE * 2, PLANET_SIZE * 2))
            return out.convert_alpha()
    s = pygame.Surface((PLANET_SIZE * 2, PLANET_SIZE * 2), pygame.SRCALPHA)
    pygame.draw.circle(s, (210, 165, 100), (PLANET_SIZE, PLANET_SIZE), PLANET_SIZE)
    pygame.draw.circle(s, (180, 120, 60), (PLANET_SIZE, PLANET_SIZE), PLANET_SIZE - 10)
    return s


PLANET_MASS = 100
SHIP_MASS = 5
G = 5
FPS = 60
PLANET_SIZE = 50
OBJ_SIZE = 5
VEL_SCALE = 100

BG = _load_scaled_bg()
PLANET = _load_planet_sprite()

WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLUE = (0, 0, 255)

class Planet:
    def __init__(self, x, y, mass):
        self.x = x
        self.y = y
        self.mass = mass

    def draw(self):
        win.blit(PLANET, (self.x - PLANET_SIZE, self.y - PLANET_SIZE))


class Spacecraft:
    def __init__(self, x, y, vel_x, vel_y, mass):
        self.x = x
        self.y = y
        self.vel_x = vel_x
        self.vel_y = vel_y
        self.mass = mass

    def move(self, planet=None):
        distance = math.sqrt((self.x - planet.x) ** 2 + (self.y - planet.y) ** 2)
        force = (G * self.mass * planet.mass) / distance**2

        acceleration = force / self.mass
        angle = math.atan2(planet.y - self.y, planet.x - self.x)

        acceleration_x = acceleration * math.cos(angle)
        acceleration_y = acceleration * math.sin(angle)

        self.vel_x += acceleration_x
        self.vel_y += acceleration_y

        self.x += self.vel_x
        self.y += self.vel_y

    def draw(self):
        pygame.draw.circle(win, RED, (int(self.x), int(self.y)), OBJ_SIZE)

def create_ship(location, mouse):
    t_x, t_y = location
    m_x, m_y = mouse
    vel_x = (m_x - t_x) / VEL_SCALE
    vel_y = (m_y - t_y) / VEL_SCALE
    return Spacecraft(t_x, t_y, vel_x, vel_y, SHIP_MASS)


def main():
    running = True
    clock = pygame.time.Clock()

    planet = Planet(WIDTH // 2, HEIGHT // 2, PLANET_MASS)
    objects = []
    temp_obj_pos = None

    while running:
        clock.tick(FPS)

        mouse_pos = pygame.mouse.get_pos()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            if event.type == pygame.MOUSEBUTTONDOWN:
                if temp_obj_pos:
                    obj = create_ship(temp_obj_pos, mouse_pos)
                    objects.append(obj)
                    temp_obj_pos = None
                else:
                    temp_obj_pos = mouse_pos

        win.blit(BG, (0, 0))

        if temp_obj_pos:
            pygame.draw.line(win, WHITE, temp_obj_pos, mouse_pos, 2)
            pygame.draw.circle(win, RED, temp_obj_pos, OBJ_SIZE)

        for obj in objects[:]:
            obj.draw()
            obj.move(planet)
            off_screen = (
                obj.x < 0 or obj.x > WIDTH or obj.y < 0 or obj.y > HEIGHT
            )
            collided = (
                math.sqrt((obj.x - planet.x) ** 2 + (obj.y - planet.y) ** 2)
                <= PLANET_SIZE
            )
            if off_screen or collided:
                objects.remove(obj)

        planet.draw()

        pygame.display.update()

    pygame.quit()


if __name__ == "__main__":
    main()
