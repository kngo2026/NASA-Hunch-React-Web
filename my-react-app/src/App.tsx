import React from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import { useColorMode, useColorModeValue } from "@chakra-ui/color-mode";

const App: React.FC = () => {
  const { toggleColorMode } = useColorMode();
  const bg = useColorModeValue("gray.50", "gray.900");
  const textColor = useColorModeValue("gray.800", "white");

  return (
    <Box bg={bg} minH="100vh" px={6} py={4}>
      <Flex as="nav" align="center" mb={10}>
        <Heading size="md" color={textColor}>
          NASA Hunch Project
        </Heading>
        <Spacer />
        <Button colorScheme="blue" onClick={toggleColorMode}>
          Toggle Theme
        </Button>
      </Flex>

      <VStack gap={6} textAlign="center" mt={10}>
        <Heading size="2xl" color={textColor}>
          Welcome to the Medical Inventory App
        </Heading>
        <Text fontSize="lg" maxW="500px" color={textColor}>
          Hello {}! Use Face ID to request an item from the inventory.
        </Text>

        <HStack gap={4}>
          <Button colorScheme="blue" size="lg">
            Face ID
          </Button>
          <Button colorScheme="green" size="lg">
            Request Item
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default App;